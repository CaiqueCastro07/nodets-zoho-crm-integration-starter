
import {
  zohoTokensRepository, registrosErrosRepository, registrosSucessosRepository
} from './repositories';
import { ErrorStruct, ZohoTokenStruct, SuccessStruct } from "../types/dto";
import { errorStruct, delay, isCircularDependency } from "../util/helpers"
import * as moment from "moment-timezone"

const createZohoTokenInDB = async (tokenData: ZohoTokenStruct, tries: number = 0): Promise<ErrorStruct | SuccessStruct> => {

  const { name: funcName } = createZohoTokenInDB

  try {

    const dbResult = await zohoTokensRepository.create(tokenData)

    if (dbResult?.errors) {
      return errorStruct(funcName, "Erro ao criar a entidade do Token Zoho no banco de dados.", { dbResult })
    }

    return { error: false }

  } catch (err) {

    if (typeof tries != 'number' || tries > 3 || tries < 0) {
      return errorStruct(funcName, "Erro fatal ao criar a entidade do Token Zoho no banco de dados.", { err })
    }

    await delay(1500 * (tries || 1))
    return await createZohoTokenInDB(tokenData, tries + 1)
  }

}


const registraErroDB = async (varsObj: { error: string, data: any, idRecord: string, moduleName: string }, tries: number = 0): Promise<ErrorStruct | SuccessStruct> => {

  const { name: funcName } = registraErroDB

  let { idRecord, data, error, moduleName } = varsObj || {}

  if (!idRecord || typeof idRecord != "string") idRecord = "- - - -"
  if (!error || typeof error != 'string') error = "Erro inválido"
  if (!moduleName || typeof moduleName != 'string') moduleName = "- - - -"

  let dados = isCircularDependency(data)

  const json = {
    idRecord,
    moduleName,
    data: dados || "sem dados",
    error,
    time: moment().subtract(3, "hour")
  }

  try {

    const dbResult = await registrosErrosRepository.create(json)

    if (dbResult?.errors) {
      return errorStruct(funcName, "Erro ao criar a entidade do registro de erros no banco de dados.", { dbResult }, true)
    }

    return { error: false }

  } catch (err) {

    if (typeof tries != 'number' || tries > 3 || tries < 0) {
      return errorStruct(funcName, "Erro fatal ao criar a entidade do registro de erros do MQ no banco de dados.", { err, varsObj }, true)
    }

    await delay(1500 * (tries || 1))
    return await registraErroDB(varsObj, tries + 1)
  }

}

const encontraErrosDB = async (varsObj: { error: string, idRecord: string }, tries: number = 0): Promise<ErrorStruct | SuccessStruct> => {

  const { name: funcName } = encontraErrosDB

  let { idRecord, error } = varsObj || {}

  if (!error || typeof error != 'string') return errorStruct(funcName, "A string de erro está inválida", { error })
  if (!idRecord || typeof idRecord != 'string') return errorStruct(funcName, "O IDRecord está inválido", { idRecord })

  try {

    const dbResult = await registrosErrosRepository.findOne({ idRecord, error })

    if (dbResult?.errors) {
      return errorStruct(funcName, "Erro ao criar a entidade do registro de erros no banco de dados.", { dbResult }, true)
    }

    return { error: false, data: dbResult }

  } catch (err) {

    if (typeof tries != 'number' || tries > 3 || tries < 0) {
      return errorStruct(funcName, "Erro fatal ao criar a entidade do registro de erros do MQ no banco de dados.", { err, varsObj }, true)
    }

    await delay(1500 * (tries || 1))
    return await encontraErrosDB(varsObj, tries + 1)
  }

}

const registroSucessoDB = async (varsObj: { message: string, data: any, idRecord: string, moduleName: string }, tries: number = 0): Promise<ErrorStruct | SuccessStruct> => {

  const { name: funcName } = registroSucessoDB

  let { idRecord, data, message, moduleName } = varsObj || {}

  if (!idRecord || typeof idRecord != "string") return errorStruct(funcName, "O ID do Record não foi enviado corretamente", { idRecord })
  if (!message || typeof message != 'string') message = "Sucesso ao validar"
  if (!moduleName || typeof moduleName != 'string') moduleName = "-----"

  const json = {
    idRecord,
    moduleName,
    data: isCircularDependency(data) || "sem dados",
    message,
    time: moment().subtract(3, "hour")
  }

  try {

    const dbResult = await registrosSucessosRepository.create(json)

    if (dbResult?.errors) {
      return errorStruct(funcName, "Erro ao criar a entidade do registro de sucesso no banco de dados.", { dbResult }, true)
    }

    return { error: false }

  } catch (err) {

    if (typeof tries != 'number' || tries > 3 || tries < 0) {
      return errorStruct(funcName, "Erro fatal ao criar a entidade do registro de sucesso no banco de dados.", { err, varsObj }, true)
    }

    await delay(1500 * (tries || 1))
    return await registroSucessoDB(varsObj, tries + 1)
  }

}

const getZohoTokenDB = async (tries: number = 0): Promise<ErrorStruct | { error: false, data: { refreshToken: string } }> => {

  const { name: funcName } = getZohoTokenDB

  try {

    const dbResult = await zohoTokensRepository.find({ environment: "prod" })
    //@ts-ignore
    const { refreshToken } = dbResult?.[0] || {}

    if (!refreshToken || typeof refreshToken != 'string') return errorStruct(funcName, "O Refresh Token não foi encontrado no banco de dados.", { dbResult })

    return { error: false, data: { refreshToken } }

  } catch (err) {

    if (typeof tries != 'number' || tries > 3 || tries < 0) {
      return errorStruct(funcName, "Erro fatal ao localizar o token no banco de dados.", { err })
    }

    await delay(1500 * (tries || 1))
    return await getZohoTokenDB(tries + 1)
  }

}


export {
  createZohoTokenInDB,
  getZohoTokenDB,
  encontraErrosDB,
  registraErroDB,
  registroSucessoDB
}