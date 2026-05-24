import "./styles.css";
import { Game } from "./game/Game";

declare global {
  interface Window {
    __VST_DEBUG__?: { game: Game };
  }
}

const canvas = document.querySelector<HTMLCanvasElement>("#game");

if (!canvas) {
  throw new Error("Game canvas not found");
}

const game = new Game(canvas);
if (new URLSearchParams(window.location.search).has("smoke")) {
  window.__VST_DEBUG__ = { game };
}
game.start();
