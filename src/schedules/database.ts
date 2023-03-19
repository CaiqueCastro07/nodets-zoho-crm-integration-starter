import * as nodeCron from "node-cron"
import { } from "../database/databaseServices";

const  isProd  = process?.env?.NODE_ENV?.toLowerCase?.() == "prod"

const options = {
    scheduled: true,
    timezone: "America/Sao_Paulo"
}

let running:boolean = false;

const agendaLimpezaErrosDesnecessarios = nodeCron.schedule("0 03 * * *", function () {
    //limpaRegistrosErrosDesnecessarios()
}, options);

export {
    agendaLimpezaErrosDesnecessarios
}