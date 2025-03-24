import { type FastifyInstance } from "fastify"
import { getUserPanels, resetPanels, setHTMLPanel, setPanel } from "./controllers"
import {
  GET_USER_DASHBOARD_PANELS_SCHEMA,
  SET_HTML_PANEL_SCHEMA,
  SET_PANEL_SCHEMA
} from "./schemas"

async function dashboardRoutes(server: FastifyInstance) {
  server.get(
    "/panels/:handle",
    { schema: GET_USER_DASHBOARD_PANELS_SCHEMA },
    getUserPanels
  )
  server.put(
    "/panels/html",
    { onRequest: [server.auth], schema: SET_HTML_PANEL_SCHEMA },
    setHTMLPanel
  )
  server.post("/panels", { onRequest: [server.auth], schema: SET_PANEL_SCHEMA }, setPanel)
  server.post("/panels/reset", { onRequest: [server.auth] }, resetPanels)
}

export default dashboardRoutes
