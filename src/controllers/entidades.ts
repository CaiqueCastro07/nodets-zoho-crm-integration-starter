import { Request, Response } from 'express'
import { delay, errorStruct, responseController, safeStringify } from '../util/helpers'
import * as moment from 'moment-timezone'
import { registraErroDB, registroSucessoDB } from '../database/databaseServices'
import Entidade from '../useCase/Entidade/entidade'
import * as express from "express"

const router = express.Router();
const controller = "entidade";

const entidadeRunning: { [key: string]: any } = {}

router.put(`/${controller}/testar/:id`, async (req: Request, res: Response): Promise<Response> => {
    //@ts-ignore
    const { id: idRecord } = req?.params || {}

    if (!idRecord || typeof idRecord != 'string') {
        return responseController(400, "O ID do record está inválido", false, { idRecord }, res);
    }

    if (idRecord in entidadeRunning) {
        return responseController(409, "Uma validação está ocorrendo para este record", false, { entidadeRunning }, res);
    }

    const entidadeManager = new Entidade({ recordId: idRecord })

    try {

        entidadeRunning[idRecord] = true

        const { error, data } = await entidadeManager.primeiraFuncao()

        agendaRetiradaDaEntidadeDoRunner(idRecord, 15)

        if (error) {
            registraErroDB({ idRecord, error, data, moduleName: "any" })

        } else {
            registroSucessoDB({ idRecord, moduleName: "any", data, message: "Sucesso!" })

        }


        return responseController(error ? 400 : 200, typeof error == 'string' ? error : `Sucesso ao...`, false, data, res);

    } catch (err) {

        agendaRetiradaDaEntidadeDoRunner(idRecord, 15)

        const { message, stack } = err || {}

        const errorToStore = message ? { message, stack } : safeStringify(err)

        registraErroDB({ idRecord, error: "Erro fatal", data: { errorToStore }, moduleName: "any" })

        return responseController(500, "Erro fatal ao...", false, {}, res);
    }

})

const agendaRetiradaDaEntidadeDoRunner = (idRecord: string, seconds?: number) => {

    if (!idRecord || typeof idRecord != "string") return
    if (!Number(seconds) || seconds < 1) seconds = 1

    setTimeout(() => {
        delete entidadeRunning?.[idRecord]
    }, 1000 * seconds)

}

export default router

