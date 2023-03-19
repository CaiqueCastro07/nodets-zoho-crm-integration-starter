import * as nodeCron from "node-cron"

const  isProd  = process?.env?.NODE_ENV?.toLowerCase?.() == "prod"

const options = {
    scheduled: true,
    timezone: "America/Sao_Paulo"
}

let running:boolean = false;

const redistribuiTarefasManha = nodeCron.schedule("*/5 9-11 * * *", function () {

    if(!isProd) return
  
}, options);

export {
    redistribuiTarefasManha
}