import { config } from "./config"
config() // irá verificar se o ambiente que o código está rodando é o prod ou local, baseado no path/cwd do process
import app from "./app";
import logger from "./util/logger";

const { NODE_ENV } = process.env || {}
const ambienteValido = !["update_zoho_types"].includes(NODE_ENV?.toLowerCase?.() || "")

const server = ambienteValido && app.listen(app.get("port"), () => {
    logger.info(`Base integração Zoho ${app.get("port")} no modo ${NODE_ENV}.`)
});
export default server;
