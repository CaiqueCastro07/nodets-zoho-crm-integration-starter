import * as express from "express";
import * as compression from "compression";  // compresses requests
import * as lusca from "lusca";
import * as mongoose from "mongoose";
import { MONGODB_URI } from "./util/secrets";
import * as cors from "cors"
import * as moment from "moment-timezone"
import { errorStruct, validAuthorization } from "./util/helpers"
import * as agendamentosDatabase from "./schedules/database";
import * as agendamentoEntidade from "./schedules/entidade";
import router  from "./controllers/entidades"

agendamentosDatabase
agendamentoEntidade

const { NODE_ENV } = process?.env || {}
// Create Express server
const app = express();
const ipsFromRequests = {}

const lastDeploy = moment().tz('America/Sao_Paulo')?.format?.("DD/MM/YYYY - hh:mm:ss")

mongoose.connect(MONGODB_URI || "", { useNewUrlParser: true, useCreateIndex: true, useUnifiedTopology: true, useFindAndModify: false }).then(
    () => { /** ready to use. The `mongoose.connect()` promise resolves to undefined. */ },
).catch(err => {
    errorStruct("mongoose.connect", "MongoDB erro na conexão", err, true)
    process.exit()
});

app.use(cors());
app.set("port", process.env.PORT || 3001);

app.use(express.json({ limit: '100mb' }))
app.use(express.urlencoded({ extended: true, limit: '100mb' }))
app.use(compression());
app.use(lusca.xssProtection(true));

app.get("/status", (_, res) => {
    return res.status(200).json({
        status: 200,
        online: true,
        integration: "Base integração Zoho",
        time: moment().tz('America/Sao_Paulo')?.format?.("DD/MM/YYYY - hh:mm:ss"),
        lastDeploy
    });
});

app.use((req, res, next) => {
    //@ts-ignore
    let ip = req?.socket?.remoteAddress

    if (!ip || typeof ip != 'string') ip = "desconhecido"

    if (ipsFromRequests?.[ip] > 0) {
        ipsFromRequests[ip] += 1
    } else {
        ipsFromRequests[ip] = 1
    }

    const authorized = validAuthorization(req?.headers)
    if (NODE_ENV?.toLowerCase?.() == "prod" && !authorized) return res.status(401).json({ status: 401, ip })
    next();

});

app.use("/api", router)

export default app;
