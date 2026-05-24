import "./styles.css";
import { Game } from "./game/Game";

const canvas = document.querySelector<HTMLCanvasElement>("#game");

if (!canvas) {
  throw new Error("Game canvas not found");
}

const game = new Game(canvas);
game.start();
