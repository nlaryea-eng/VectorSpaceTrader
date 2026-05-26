import { getPanelChromeLayout, getScreenPanelBounds, type PanelChromeLayout, type SubRect } from "../../Layout";
import {
  filterSystems,
  getMapSystemVisualState,
  getSystemAtProjectedMapPoint,
  hasActiveMapFilter,
  isSystemDiscovered,
  matchesMapFilters,
  projectSystemToMap,
  type MapFilterState
} from "../../MapSearch";
import { getMarketSignalShortLabel, getRouteValidity, getStationServiceTiles, type RouteValidity } from "../../SignalGlassScreens";
import { getPlayerShipStats } from "../../Ships";
import { SIGNAL_GLASS_TEXT_SIZES, SIGNAL_GLASS_THEME, THEME } from "../../Theme";
import type { MarketItem, Mission, PlayerState, StarSystem } from "../../types";
import { canJump, getFuelRequired, getJumpDistance, UNIVERSE_CONSTANTS } from "../../Universe";
import { addButtonZone } from "../ButtonZones";
import { drawButton, drawChip, drawHudPanel, drawPanel, drawText } from "../CanvasPrimitives";
import { drawFooterHint, drawHeaderActions, drawPanelHeader } from "../PanelChrome";
import type { RenderContext } from "../RenderContext";

export interface MapViewport {
  width: number;
  height: number;
  narrow: boolean;
}

export interface MapScreenState {
  player: PlayerState;
  systems: StarSystem[];
  selectedSystemId: number;
  market: MarketItem[];
  missions: Mission[];
  mousePosition: { x: number; y: number } | null;
  mapFilters: MapFilterState;
  mapFilterSheetOpen: boolean;
}

export interface MapLayout {
  bounds: SubRect;
  chrome: PanelChromeLayout;
  mapRect: SubRect;
  detailRect: SubRect;
}

export interface MapSystemHitTestInput {
  viewport: MapViewport;
  systems: StarSystem[];
  player: PlayerState;
  filters: MapFilterState;
  click: { x: number; y: number };
  hitRadius?: number;
}

export function getMapLayout(viewport: MapViewport): MapLayout {
  const bounds = getScreenPanelBounds({ width: viewport.width, height: viewport.height }, "map");
  const chrome = getPanelChromeLayout(bounds, viewport.narrow);

  const mapX = viewport.narrow ? chrome.contentBounds.x : chrome.contentBounds.x;
  const mapY = chrome.contentBounds.y + (viewport.narrow ? 4 : 8);
  const mapW = viewport.narrow ? chrome.contentBounds.width : chrome.contentBounds.width * 0.64;
  const mapH = viewport.narrow
    ? Math.min(viewport.height * 0.34, chrome.contentBounds.height * 0.55)
    : Math.min(viewport.height * 0.5, chrome.contentBounds.height - 16);

  const detailX = viewport.narrow ? chrome.contentBounds.x : mapX + mapW + 18;
  const detailY = viewport.narrow ? mapY + mapH + 12 : mapY;
  const detailW = viewport.narrow
    ? chrome.contentBounds.width
    : Math.max(210, chrome.contentBounds.x + chrome.contentBounds.width - detailX);
  const detailH = viewport.narrow
    ? Math.min(118, Math.max(96, chrome.contentBounds.y + chrome.contentBounds.height - detailY - 6))
    : mapH;

  return {
    bounds,
    chrome,
    mapRect: { x: mapX, y: mapY, width: mapW, height: mapH },
    detailRect: { x: detailX, y: detailY, width: detailW, height: detailH }
  };
}

export function getMapSystemHitTestRect(viewport: MapViewport): SubRect {
  const panelX = viewport.narrow ? 8 : viewport.width * 0.08;
  const panelY = viewport.narrow ? 12 : viewport.height * 0.1;
  const panelW = viewport.narrow ? viewport.width - 16 : viewport.width * 0.84;
  const titleY = panelY + (viewport.narrow ? 26 : 40);

  return {
    x: viewport.narrow ? panelX + 12 : viewport.width * 0.12,
    y: viewport.narrow ? titleY + 18 : viewport.height * 0.23,
    width: viewport.narrow ? panelW - 24 : viewport.width * 0.54,
    height: viewport.narrow ? viewport.height * 0.42 : viewport.height * 0.56
  };
}

export function hitTestMapSystem(input: MapSystemHitTestInput): StarSystem | null {
  const rect = getMapSystemHitTestRect(input.viewport);
  return getSystemAtProjectedMapPoint(
    input.systems,
    input.click.x,
    input.click.y,
    rect.x,
    rect.y,
    rect.width,
    rect.height,
    UNIVERSE_CONSTANTS.width,
    UNIVERSE_CONSTANTS.height,
    input.player,
    input.filters,
    input.hitRadius ?? 20
  );
}

export function renderMap(rc: RenderContext, state: MapScreenState): void {
  const { ctx } = rc;
  const { bounds, chrome, mapRect, detailRect } = getMapLayout({ width: rc.width, height: rc.height, narrow: rc.narrow });
  const { x: panelX, y: panelY, width: panelW, height: panelH } = bounds;
  const { x: mapX, y: mapY, width: mapW, height: mapH } = mapRect;
  const { x: detailX, y: detailY, width: detailW, height: detailH } = detailRect;

  drawPanel(rc, panelX, panelY, panelW, panelH);
  const matches = filterSystems(state.systems, state.mapFilters, state.player);
  const titleAvailableWidth = rc.narrow ? chrome.titleRow.width - chrome.headerActionRow.width - 8 : undefined;
  drawPanelHeader(rc, chrome, "UNIVERSE NAVIGATION", `SYSTEMS ${matches.length}/${state.systems.length}`, "SEARCH / FILTER / CLASS", titleAvailableWidth);
  drawHeaderActions(rc, chrome, [
    { id: "help", label: "HELP [?]", width: rc.narrow ? 66 : 92 },
    { id: "map-back", label: rc.narrow ? "CLOSE" : "CLOSE MAP", width: rc.narrow ? 72 : 112 }
  ]);

  ctx.strokeStyle = "rgba(0, 242, 255, 0.2)";
  ctx.strokeRect(mapX, mapY, mapW, mapH);

  const current = state.systems[state.player.currentSystemId];
  const selected = state.systems[state.selectedSystemId];
  const missionDestinationIds = getMissionDestinationIds(state);
  const activeMissionDestinationId = state.player.activeMission?.destinationSystemId ?? null;
  const selectedHasMission = missionDestinationIds.has(selected.id);
  const hoveredSystem = state.mousePosition
    ? getSystemAtProjectedMapPoint(
      state.systems,
      state.mousePosition.x,
      state.mousePosition.y,
      mapX,
      mapY,
      mapW,
      mapH,
      UNIVERSE_CONSTANTS.width,
      UNIVERSE_CONSTANTS.height,
      state.player,
      state.mapFilters,
      14
    )
    : null;

  const currentPoint = projectSystemToMap(current, mapX, mapY, mapW, mapH, UNIVERSE_CONSTANTS.width, UNIVERSE_CONSTANTS.height);
  const selectedPoint = projectSystemToMap(selected, mapX, mapY, mapW, mapH, UNIVERSE_CONSTANTS.width, UNIVERSE_CONSTANTS.height);
  const routeValidity = getRouteValidity(current, selected, state.player);
  const shipStats = getPlayerShipStats(state.player);
  const ringRx = (shipStats.maxJumpRange / UNIVERSE_CONSTANTS.width) * mapW;
  const ringRy = (shipStats.maxJumpRange / UNIVERSE_CONSTANTS.height) * mapH;

  ctx.save();
  ctx.beginPath();
  ctx.rect(mapX, mapY, mapW, mapH);
  ctx.clip();

  ctx.save();
  ctx.strokeStyle = "rgba(0, 242, 255, 0.25)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.ellipse(currentPoint.x, currentPoint.y, ringRx, ringRy, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  if (selected.id !== current.id && selectedHasMission) {
    ctx.save();
    ctx.strokeStyle = THEME.colors.accentAmber;
    ctx.globalAlpha = 0.34;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(currentPoint.x, currentPoint.y);
    ctx.lineTo(selectedPoint.x, selectedPoint.y);
    ctx.stroke();
    ctx.restore();
  }

  if (selected.id !== current.id) {
    const routeColor = routeValidity.state === "valid"
      ? THEME.colors.success
      : routeValidity.state === "warning"
        ? THEME.colors.warning
        : THEME.colors.danger;
    ctx.save();
    ctx.strokeStyle = routeColor;
    ctx.globalAlpha = 0.72;
    ctx.lineWidth = 1.5;
    ctx.setLineDash(routeValidity.state === "valid" ? [] : [6, 5]);
    ctx.beginPath();
    ctx.moveTo(currentPoint.x, currentPoint.y);
    ctx.lineTo(selectedPoint.x, selectedPoint.y);
    ctx.stroke();
    ctx.restore();
  }

  const labeledPoints: Array<{ x: number; y: number }> = [];

  for (const system of state.systems) {
    const point = projectSystemToMap(system, mapX, mapY, mapW, mapH, UNIVERSE_CONSTANTS.width, UNIVERSE_CONSTANTS.height);
    const isCurrent = system.id === current.id;
    const isSelected = system.id === selected.id;
    const withinJumpRange = getJumpDistance(current, system) <= shipStats.maxJumpRange;
    const reachable = !isCurrent && canJump(current, system, state.player.fuel, state.player);
    const fuelBlocked = !isCurrent && withinJumpRange && !reachable;
    const discovered = isSystemDiscovered(state.player, system.id);
    const matched = matchesMapFilters(system, state.mapFilters, state.player);
    const visualState = getMapSystemVisualState(system, state.mapFilters, state.player, selected.id);
    const nearby = getJumpDistance(current, system) <= shipStats.maxJumpRange * 0.65;
    const activeFilter = hasActiveMapFilter(state.mapFilters);
    const isMissionDestination = missionDestinationIds.has(system.id);
    const isActiveMissionDestination = activeMissionDestinationId === system.id;
    const highHazard = discovered && system.hazardLevel > 5;

    ctx.globalAlpha = visualState.protected ? 1 : visualState.dimmed ? 0.2 : discovered ? 1 : 0.4;

    let color = THEME.colors.textDim;
    if (isCurrent) color = THEME.colors.textPrimary;
    else if (isSelected) color = THEME.colors.accentPink;
    else if (matched && activeFilter) color = THEME.colors.accentAmber;
    else if (reachable) color = THEME.colors.accentTeal;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(point.x, point.y, isCurrent || isSelected ? 5 : matched && activeFilter ? 4 : 2.5, 0, Math.PI * 2);
    ctx.fill();

    if (isSelected) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(point.x, point.y, 10, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;

    const decorationAlpha = visualState.protected ? 1 : visualState.dimmed ? 0.24 : discovered ? 0.85 : 0.38;
    if (!isCurrent && !isSelected && reachable) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.55, decorationAlpha);
      ctx.strokeStyle = THEME.colors.accentTeal;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(point.x, point.y, 7.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    } else if (!isCurrent && !isSelected && fuelBlocked) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.7, decorationAlpha);
      ctx.strokeStyle = THEME.colors.warning;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(point.x - 5, point.y + 6);
      ctx.lineTo(point.x + 5, point.y + 6);
      ctx.stroke();
      ctx.restore();
    }

    if (isMissionDestination) {
      ctx.save();
      ctx.globalAlpha = isActiveMissionDestination ? 0.92 : 0.64;
      ctx.strokeStyle = THEME.colors.accentAmber;
      ctx.lineWidth = isActiveMissionDestination ? 1.6 : 1;
      ctx.beginPath();
      ctx.moveTo(point.x, point.y - 11);
      ctx.lineTo(point.x + 9, point.y);
      ctx.lineTo(point.x, point.y + 11);
      ctx.lineTo(point.x - 9, point.y);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }

    if (highHazard) {
      ctx.save();
      ctx.globalAlpha = 0.78;
      ctx.strokeStyle = THEME.colors.danger;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(point.x - 5, point.y - 8);
      ctx.lineTo(point.x, point.y - 13);
      ctx.lineTo(point.x + 5, point.y - 8);
      ctx.stroke();
      ctx.restore();
    }

    if (hoveredSystem?.id === system.id && !isSelected) {
      ctx.save();
      ctx.strokeStyle = SIGNAL_GLASS_THEME.colors.focus;
      ctx.globalAlpha = 0.85;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(point.x, point.y, 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      drawText(rc, `FOCUS ${system.name.toUpperCase()}`, Math.min(point.x + 14, mapX + mapW - 160), Math.max(point.y - 16, mapY + 14), {
        size: 10,
        font: THEME.fonts.mono,
        color: SIGNAL_GLASS_THEME.colors.focus
      });
    }

    let labelPriority = 0;
    if (isCurrent || isSelected) labelPriority = 3;
    else if (matched && activeFilter) labelPriority = 2;
    else if (nearby) labelPriority = 1;

    if (labelPriority > 0) {
      const tooClose = labeledPoints.some((p) => Math.abs(p.x - point.x) < 48 && Math.abs(p.y - point.y) < 15);
      if (!tooClose || labelPriority >= 3) {
        drawText(rc, system.name, point.x + 12, point.y, {
          align: "left",
          size: 11,
          font: THEME.fonts.mono,
          color: discovered ? THEME.colors.textPrimary : THEME.colors.textDim
        });
        labeledPoints.push(point);
      }
    }

    const hitR = 12;
    addButtonZone(rc.buttonZones, { id: `map-system-${system.id}`, label: system.name, x: point.x - hitR, y: point.y - hitR, width: hitR * 2, height: hitR * 2 });
  }
  ctx.restore();

  drawHudPanel(rc, detailX, detailY, detailW, detailH);
  const detailTitleSize = rc.narrow ? 14 : 18;
  drawText(rc, selected.name.toUpperCase(), detailX + 12, detailY + (rc.narrow ? 18 : 24), {
    size: detailTitleSize, font: THEME.fonts.accent, color: THEME.colors.accentTeal
  });

  const dist = getJumpDistance(current, selected);
  const fuel = getFuelRequired(current, selected, state.player);
  const fuelAfter = state.player.fuel - fuel;
  const discovered = isSystemDiscovered(state.player, selected.id);
  const serviceLabels = getAvailableServiceLabels(selected);
  const tradeHints = getTradeSignalHints(state.market);

  const details = [
    { label: "DISTANCE", value: `${dist.toFixed(1)} LY` },
    { label: "FUEL REQ", value: `${fuel.toFixed(1)}`, color: fuel > state.player.fuel ? THEME.colors.danger : THEME.colors.accentAmber },
    { label: "CLASS", value: discovered ? selected.profile.classId.toUpperCase() : "UNKNOWN" },
    { label: "ECONOMY", value: discovered ? selected.economy.toUpperCase() : "UNKNOWN" },
    { label: "HAZARD", value: discovered ? formatMapValue(selected.hazardTag).toUpperCase() : "UNKNOWN", color: discovered ? (selected.hazardLevel > 5 ? THEME.colors.danger : THEME.colors.success) : THEME.colors.textDim },
    { label: "ROUTE", value: routeValidity.label.toUpperCase(), color: routeValidity.state === "valid" ? THEME.colors.success : routeValidity.state === "warning" ? THEME.colors.warning : THEME.colors.danger },
  ];

  if (rc.narrow) {
    const grid = details;
    const cellW = (detailW - 24) / 2;
    grid.forEach((d, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = detailX + 12 + col * cellW;
      const y = detailY + 38 + row * 16;
      drawText(rc, d.label, x, y, { size: SIGNAL_GLASS_TEXT_SIZES.mapDetail, font: THEME.fonts.mono, color: THEME.colors.textSecondary });
      drawText(rc, d.value, x + cellW - 12, y, { align: "right", size: SIGNAL_GLASS_TEXT_SIZES.mapDetail, font: THEME.fonts.mono, color: d.color ?? THEME.colors.textPrimary });
    });
    drawServiceChips(rc, detailX + 12, detailY + 88, detailW - 24, serviceLabels, 2);
    drawText(rc, compactRoutePreview(routeValidity, fuelAfter, selectedHasMission), detailX + 12, detailY + 108, {
      size: 9,
      font: THEME.fonts.mono,
      color: routeValidityColor(routeValidity)
    });
  } else {
    details.forEach((d, i) => {
      const dy = detailY + 64 + i * 24;
      drawText(rc, d.label, detailX + 16, dy, { size: 10, font: THEME.fonts.mono, color: THEME.colors.textSecondary });
      drawText(rc, d.value, detailX + detailW - 16, dy, { align: "right", size: 10, font: THEME.fonts.mono, color: d.color ?? THEME.colors.textPrimary });
    });
    const descriptorY = detailY + 64 + details.length * 24;
    if (discovered) {
      drawText(rc, selected.profile.localDescriptor.toUpperCase(), detailX + 16, descriptorY, { size: 11, font: THEME.fonts.mono, color: THEME.colors.accentAmber });
    }
    drawRoutePreviewCard(rc, detailX + 14, descriptorY + 12, detailW - 28, routeValidity, fuelAfter, selectedHasMission);
    drawText(rc, "DESTINATION SERVICES", detailX + 16, descriptorY + 86, { size: 10, font: THEME.fonts.mono, color: THEME.colors.textSecondary });
    drawServiceChips(rc, detailX + 16, descriptorY + 108, detailW - 32, serviceLabels, 4);
    drawText(rc, `LOCAL TRADE ${tradeHints}`, detailX + 16, Math.min(detailY + detailH - 10, descriptorY + 132), {
      size: 10,
      font: THEME.fonts.mono,
      color: THEME.colors.accentAmber
    });
  }

  if (rc.narrow) {
    drawButton(rc, "map-jump", "JUMP [Enter]", chrome.footerPrimaryActionRow.x, chrome.footerPrimaryActionRow.y, chrome.footerPrimaryActionRow.width, chrome.footerPrimaryActionRow.height);
  } else {
    drawButton(rc, "map-jump", "ENGAGE JUMP DRIVE [Enter]", detailX, chrome.footerPrimaryActionRow.y, Math.min(detailW, 280), chrome.footerPrimaryActionRow.height);
  }

  drawMapFooterStatus(rc, chrome, state.mapFilters, missionDestinationIds.size);

  const filterDefs = [
    { id: "map-filter-hazard", label: "HAZ", value: state.mapFilters.hazard },
    { id: "map-filter-economy", label: "ECO", value: state.mapFilters.economy },
    { id: "map-filter-government", label: "GOV", value: state.mapFilters.government },
    { id: "map-filter-opportunity", label: "OPP", value: state.mapFilters.opportunity },
    { id: "map-filter-discovery", label: "DISC", value: state.mapFilters.discovery },
    { id: "map-filter-service", label: "SVC", value: state.mapFilters.service },
    { id: "map-filter-systemClass", label: "CLASS", value: state.mapFilters.systemClass },
    { id: "map-filter-clear", label: "CLEAR", value: "" }
  ];

  if (rc.narrow) {
    const activeCount = filterDefs.filter((f) => f.id !== "map-filter-clear" && f.value !== "all").length;
    const toggleLabel = state.mapFilterSheetOpen
      ? "DONE"
      : activeCount > 0 ? `FILTERS [${activeCount}]` : "FILTERS";
    drawButton(
      rc,
      "map-filters-toggle",
      toggleLabel,
      chrome.footerSecondaryActionRow.x,
      chrome.footerSecondaryActionRow.y,
      chrome.footerSecondaryActionRow.width,
      chrome.footerSecondaryActionRow.height
    );

    if (state.mapFilterSheetOpen) {
      const cols = 4;
      const fbGap = 4;
      const fbH = 26;
      const fbW = Math.floor((chrome.footerSecondaryActionRow.width - fbGap * (cols - 1)) / cols);
      const sheetRows = 2;
      const sheetInnerH = sheetRows * fbH + (sheetRows - 1) * fbGap;
      const sheetPadY = 8;
      const sheetH = sheetInnerH + sheetPadY * 2;
      const sheetY = chrome.footerSecondaryActionRow.y - sheetH - 4;
      const sheetX = chrome.footerSecondaryActionRow.x;
      const sheetW = chrome.footerSecondaryActionRow.width;

      ctx.save();
      ctx.fillStyle = THEME.colors.bgDeep;
      ctx.globalAlpha = 0.92;
      ctx.beginPath();
      ctx.roundRect(sheetX, sheetY, sheetW, sheetH, SIGNAL_GLASS_THEME.radius.control);
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = "rgba(0, 242, 255, 0.18)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(sheetX, sheetY, sheetW, sheetH, SIGNAL_GLASS_THEME.radius.control);
      ctx.stroke();

      const firstFbY = sheetY + sheetPadY;
      filterDefs.forEach((f, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const fx = sheetX + col * (fbW + fbGap);
        const fy = firstFbY + row * (fbH + fbGap);
        const active = f.id === "map-filter-clear" ? false : f.value !== "all";
        const label = f.id === "map-filter-clear" ? "CLR" : `${f.label}:${active ? f.value.slice(0, 3).toUpperCase() : "ALL"}`;
        drawButton(rc, f.id, label, fx, fy, fbW, fbH);
      });
    }
  } else {
    const fbGap = 6;
    const fbW = Math.floor((chrome.footerSecondaryActionRow.width - fbGap * (filterDefs.length - 1)) / filterDefs.length);
    const fbH = Math.min(30, chrome.footerSecondaryActionRow.height);
    const fbY = chrome.footerSecondaryActionRow.y + (chrome.footerSecondaryActionRow.height - fbH) / 2;
    const fbStartX = chrome.footerSecondaryActionRow.x;

    filterDefs.forEach((f, i) => {
      const fx = fbStartX + i * (fbW + fbGap);
      const active = f.id === "map-filter-clear" ? false : f.value !== "all";
      const label = f.id === "map-filter-clear" ? "CLR" : `${f.label}:${active ? f.value.slice(0, 3).toUpperCase() : "ALL"}`;
      drawButton(rc, f.id, label, fx, fbY, fbW, fbH);
    });
    drawFooterHint(rc, chrome, "SEARCH SYSTEMS · FILTERS STAY CLEAR OF HEADER COMMANDS · ESC CLOSE");
  }
}

function formatMapValue(value: string): string {
  if (value === "all") return "all";
  return value.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`);
}

export function getMissionDestinationIds(state: Pick<MapScreenState, "player" | "missions">): Set<number> {
  const destinations = new Set<number>();
  if (state.player.activeMission) destinations.add(state.player.activeMission.destinationSystemId);
  for (const mission of state.missions) {
    destinations.add(mission.destinationSystemId);
  }
  return destinations;
}

export function getTradeSignalHints(market: readonly MarketItem[]): string {
  const signaled = market
    .filter((item) => item.marketSignal && item.marketSignal !== "STEADY")
    .slice(0, 2)
    .map((item) => `${getMarketSignalShortLabel(item.marketSignal ?? "STEADY")} ${item.name.toUpperCase()}`);
  return signaled.length > 0 ? signaled.join(" · ") : "STDY LOCAL STOCK";
}

export function getActiveFilterLabels(filters: MapFilterState): string[] {
  const labels: string[] = [];
  const query = filters.query.trim();
  if (query) labels.push(`Q ${query.slice(0, 8).toUpperCase()}`);
  if (filters.hazard !== "all") labels.push(`HAZ ${formatShortFilterValue(filters.hazard)}`);
  if (filters.economy !== "all") labels.push(`ECO ${formatShortFilterValue(filters.economy)}`);
  if (filters.government !== "all") labels.push(`GOV ${formatShortFilterValue(filters.government)}`);
  if (filters.opportunity !== "all") labels.push(`OPP ${formatShortFilterValue(filters.opportunity)}`);
  if (filters.discovery !== "all") labels.push(`DISC ${formatShortFilterValue(filters.discovery)}`);
  if (filters.service !== "all") labels.push(`SVC ${formatShortFilterValue(filters.service)}`);
  if (filters.systemClass !== "all") labels.push(`CLASS ${formatShortFilterValue(filters.systemClass)}`);
  return labels;
}

function routeValidityColor(routeValidity: RouteValidity): string {
  if (routeValidity.state === "valid") return THEME.colors.success;
  if (routeValidity.state === "warning") return THEME.colors.warning;
  return THEME.colors.danger;
}

function compactRoutePreview(routeValidity: RouteValidity, fuelAfter: number, selectedHasMission: boolean): string {
  const mission = selectedHasMission ? " · MISSION DEST" : "";
  return `ROUTE PREVIEW ${routeValidity.label.toUpperCase()} · FUEL AFTER ${Math.max(0, fuelAfter).toFixed(1)}${mission}`;
}

function drawRoutePreviewCard(
  rc: RenderContext,
  x: number,
  y: number,
  width: number,
  routeValidity: RouteValidity,
  fuelAfter: number,
  selectedHasMission: boolean
): void {
  const { ctx } = rc;
  const color = routeValidityColor(routeValidity);
  const cardH = 56;
  ctx.save();
  ctx.fillStyle = "rgba(14, 19, 32, 0.72)";
  ctx.beginPath();
  ctx.roundRect(x, y, width, cardH, SIGNAL_GLASS_THEME.radius.control);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.48;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  drawText(rc, "ROUTE PREVIEW", x + 10, y + 16, { size: 10, font: THEME.fonts.mono, color: THEME.colors.textSecondary });
  drawText(rc, routeValidity.label.toUpperCase(), x + width - 10, y + 16, { align: "right", size: 10, font: THEME.fonts.mono, color });
  drawText(rc, routeValidity.reason.toUpperCase(), x + 10, y + 36, { size: 10, font: THEME.fonts.mono, color: THEME.colors.textPrimary });
  drawText(rc, `FUEL AFTER ${Math.max(0, fuelAfter).toFixed(1)}`, x + width - 10, y + 36, { align: "right", size: 10, font: THEME.fonts.mono, color });
  if (selectedHasMission) {
    drawText(rc, "MISSION DEST", x + 10, y + 50, { size: 9, font: THEME.fonts.mono, color: THEME.colors.accentAmber });
  }
}

function drawServiceChips(
  rc: RenderContext,
  x: number,
  y: number,
  maxWidth: number,
  labels: readonly string[],
  maxCount: number
): void {
  const visible = labels.slice(0, maxCount);
  if (visible.length === 0) {
    drawText(rc, "SERVICES NONE", x, y, { size: 9, font: THEME.fonts.mono, color: THEME.colors.textDim });
    return;
  }

  let cursor = x;
  for (const label of visible) {
    const width = drawChip(rc, cursor, y, label, SIGNAL_GLASS_THEME.colors.accent2);
    cursor += width + 6;
    if (cursor - x > maxWidth) break;
  }
}

function drawMapFooterStatus(
  rc: RenderContext,
  chrome: PanelChromeLayout,
  filters: MapFilterState,
  missionDestinationCount: number
): void {
  const activeFilters = getActiveFilterLabels(filters);
  const text = activeFilters.length > 0
    ? `ACTIVE FILTERS ${activeFilters.join(" · ")}`
    : `LEGEND REACHABLE TEAL · BLOCKED DIM · MISSION ${missionDestinationCount} · HAZARD MARK`;
  drawText(rc, text, chrome.footerStatusRow.x, chrome.footerStatusRow.y + chrome.footerStatusRow.height / 2 + 4, {
    size: rc.narrow ? 8 : 10,
    font: THEME.fonts.mono,
    color: activeFilters.length > 0 ? THEME.colors.accentAmber : THEME.colors.textDim
  });
}

function getAvailableServiceLabels(system: StarSystem): string[] {
  return getStationServiceTiles(system)
    .filter((tile) => tile.available)
    .map((tile) => tile.shortLabel);
}

function formatShortFilterValue(value: string): string {
  return value.replace(/[A-Z]/g, (letter) => ` ${letter}`).trim().slice(0, 8).toUpperCase();
}
