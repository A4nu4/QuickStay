import { renderToString } from "react-dom/server";
import App from "./App";
import { StaticRouter } from "react-router";

export function render(url) {
  return renderToString(
    <StaticRouter location={url}>
      <App />
    </StaticRouter>,
  );
}
