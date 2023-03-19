import request from "supertest";
import app from "../src/app";
import dotenv from "dotenv"
dotenv.config()

const userid = process.env.TEST_USER || "";
const apikey = process.env.APIKEY || "";
let taskId = '';

let count = 0;

describe("POST and GET tasks pre-tests.", () => {

    it(`[${++count}] !should create an task in the database.`, (done) => {
        request(app).post("/task")
            .set('Authorization', `Bearer ${apikey}`)
            .set('userid', userid)
            .send({ newtask: 'do the stank leg' }) // tarefa criada para os testes abaixo
            .end(function (err, res) {
                expect(res?.body?.status).toBe(200)
                expect(res?.body?.message).toBe('Tarefa adicionada com sucesso.')
                expect(res?.body?.error).toBe(false)
                expect(res?.body?.data).toStrictEqual({})
                done()
            });
    })

    it(`[${++count}] !should return a JSON with an array of Tasks`, (done) => {
        request(app).get("/tasks")
            .set('Authorization', `Bearer ${apikey}`)
            .set('Authorization', `Bearer ${apikey}`)
            .set('userid', userid)
            .end(function (err, res) {

                const task = res?.body?.data?.[0]
                taskId = task?._id // passa o ID da tarefa criada no passo anterior para rodar todos os testes
                console.log("Set the taskId var to:" + taskId)

                if (!taskId || typeof taskId != 'string') {
                    const error = "taskId não encontrada, verifique o endpoint get /tasks"
                    process.exit(process.pid)
                }

                if (typeof task?.task != 'string' || typeof task?.done != 'boolean'
                    || typeof task?.priority != 'number') {
                    const error = "Verifique o tipo da variável task, done e priority dentro do objeto 'task'."
                    process.exit(process.pid)
                }

                expect(res?.body?.status).toBe(200)
                expect(typeof task?.task).toBe('string')
                expect(typeof task?.done).toBe('boolean')
                expect(typeof task?.priority).toBe('number')
                expect(Array.isArray(res?.body?.data)).toBe(true)
                expect(res?.body?.error).toBe(false)
                done()
            });
    })

})

describe("GET /", () => {
    jest.setTimeout(10000)

    it(`[${++count}] should return a JSON with the status: 401 when sending no 'Authorization' header.`, (done) => {
        request(app).get("/")
            .end(function (err, res) {
                expect(res?.body?.status).toBe(401)
                expect(typeof res?.body?.message).toBe('string')
                done()
            });
    })

    it(`[${++count}] should return a JSON with the status: 401 when sending wrong 'Authorization' header.`, (done) => {
        request(app).get("/")
            .set('Authorization', 'Bearer 1234')
            .end(function (err, res) {
                expect(res?.body?.status).toBe(401)
                expect(typeof res?.body?.message).toBe('string')
                done()
            });
    })

    it(`[${++count}] should return a JSON with the status:200, portfolio:[string], online:true, time:[string].`, (done) => {
        request(app).get("/")
            .set('Authorization', `Bearer ${apikey}`)
            .end(function (err, res) {
                expect(res?.body?.status).toBe(200)
                expect(res.body.online).toBe(true)
                expect(typeof res.body.integration).toBe('string')
                expect(typeof res.body.time).toBe('string')
                done()
            });
    })

});

describe("GET /tasks", () => {
    jest.setTimeout(10000)

    it(`[${++count}] should return a JSON with the status 401.`, (done) => {
        request(app).get("/tasks")
            .set('Authorization', `Bearer 12345`)
            .set('userid', userid)
            .end(function (err, res) {
                expect(res?.body?.status).toBe(401)
                expect(typeof res?.body?.message).toBe('string')
                done()
            });
    })

    it(`[${++count}] should return a JSON with the status 400.`, (done) => {
        request(app).get("/tasks")
            .set('Authorization', `Bearer ${apikey}`)
            .set('userid', "  ")
            .end(function (err, res) {
                expect(res?.body?.status).toBe(400)
                expect(res?.body?.message).toBe('Usuário não enviado.')
                expect(res?.body?.error).toBe(true)
                done()
            });
    })

    it(`[${++count}] should return a JSON with the status 400.`, (done) => {
        request(app).get("/tasks")
            .set('Authorization', `Bearer ${apikey}`)
            .set('userid', "129u429faa")
            .end(function (err, res) {
                expect(res?.body?.status).toBe(500)
                expect(res?.body?.message).toBe("Falha ao recuperar as tarefas. Contate o suporte")
                expect(res?.body?.error).toBe(true)
                done()
            });
    })

})

describe("POST /task", () => {
    jest.setTimeout(10000)

    it(`[${++count}] should return a JSON with the status 401.`, (done) => {
        request(app).post("/task")
            .set('Authorization', `Bearer 12345`)
            .set('userid', userid)
            .send({ newtask: "do the stank leg" })
            .end(function (err, res) {
                expect(res?.body?.status).toBe(401)
                expect(typeof res?.body?.message).toBe('string')
                done()
            });
    })

    it(`[${++count}] should return a JSON with the status 400.`, (done) => {
        request(app).post("/task")
            .set('Authorization', `Bearer ${apikey}`)
            .set('userid', "   ")
            .send({ newtask: "do the stank leg" })
            .end(function (err, res) {
                expect(res?.body?.status).toBe(400)
                expect(res?.body?.message).toBe('Erro ao criar tarefa, usuário não enviado.')
                expect(res?.body?.error).toBe(true)
                done()
            });
    })

    it(`[${++count}] should return a JSON with the status 400.`, (done) => {
        request(app).post("/task")
            .set('Authorization', `Bearer ${apikey}`)
            .set('userid', userid)
            .send({ newtask: [1, 2, 3] })
            .end(function (err, res) {
                expect(res?.body?.status).toBe(400)
                expect(res?.body?.message).toBe('Erro ao criar tarefa, verifique os valores enviados.')
                expect(res?.body?.error).toBe(true)
                done()
            });
    })

    it(`[${++count}] should return a JSON with the status 400.`, (done) => {
        request(app).post("/task")
            .set('Authorization', `Bearer ${apikey}`)
            .set('userid', userid)
            .send({ newtask: false })
            .end(function (err, res) {
                expect(res?.body?.status).toBe(400)
                expect(res?.body?.message).toBe('Erro ao criar tarefa, verifique os valores enviados.')
                expect(res?.body?.error).toBe(true)
                done()
            });
    })

    it(`[${++count}] should return a JSON with the status 400.`, (done) => {
        request(app).post("/task")
            .set('Authorization', `Bearer ${apikey}`)
            .set('userid', userid)
            .send({ newtask: "" })
            .end(function (err, res) {
                expect(res?.body?.status).toBe(400)
                expect(res?.body?.message).toBe('Erro ao criar tarefa, verifique os valores enviados.')
                expect(res?.body?.error).toBe(true)
                done()
            });
    })

    it(`[${++count}] should return a JSON with the status 400.`, (done) => {
        request(app).post("/task")
            .set('Authorization', `Bearer ${apikey}`)
            .set('userid', "")
            .send({ newtask: "do the stank leg" })
            .end(function (err, res) {
                expect(res?.body?.status).toBe(400)
                expect(res?.body?.message).toBe('Erro ao criar tarefa, usuário não enviado.')
                expect(res?.body?.error).toBe(true)
                done()
            });
    })

    it(`[${++count}] should return a JSON with the status 400.`, (done) => {
        request(app).post("/task")
            .set('Authorization', `Bearer ${apikey}`)
            .set('userid', "")
            .send({ tosk: "do the stank leg" })
            .end(function (err, res) {
                expect(res?.body?.status).toBe(400)
                expect(res?.body?.message).toBe('Erro ao criar tarefa, verifique os valores enviados.')
                expect(res?.body?.error).toBe(true)
                done()
            });
    })

});

describe("PUT /task/:id", () => {
    jest.setTimeout(10000)

    it(`[${++count}] should return a JSON with the status 400.`, (done) => {
        request(app).put("/task/" + taskId)
            .set('Authorization', `Bearer ${apikey}`)
            .set('userid', userid)
            .send({ tosk: "do the stank leg" })
            .end(function (err, res) {
                expect(res?.body?.status).toBe(400)
                expect(res?.body?.message).toBe("Erro ao atualizar tarefa, tipo do valor não permitido.")
                expect(res?.body?.error).toBe(true)
                done()
            });
    })

    it(`[${++count}] should return a JSON with the status 400.`, (done) => {
        request(app).put("/task/" + taskId)
            .set('Authorization', `Bearer ${apikey}`)
            .set('userid', "  ")
            .send({ val: "i've changed" })
            .end(function (err, res) {
                expect(res?.body?.status).toBe(400)
                expect(res?.body?.message).toBe("Erro ao atualizar tarefa, usuário não enviado.")
                expect(res?.body?.error).toBe(true)
                done()
            });
    })

    it(`[${++count}] should return a JSON with the status 400.`, (done) => {
        request(app).put("/task/" + taskId)
            .set('Authorization', `Bearer ${apikey}`)
            .set('userid', userid)
            .send({ wrong: "do the stank leg" })
            .end(function (err, res) {
                expect(res?.body?.status).toBe(400)
                expect(res?.body?.message).toBe("Erro ao atualizar tarefa, tipo do valor não permitido.")
                expect(res?.body?.error).toBe(true)
                done()
            });
    })

    it(`[${++count}] should return a JSON with the status 400.`, (done) => {
        request(app).put("/task/" + taskId)
            .set('Authorization', `Bearer ${apikey}`)
            .set('userid', userid)
            .send({ val: [1, 2] })
            .end(function (err, res) {
                expect(res?.body?.status).toBe(400)
                expect(res?.body?.message).toBe("Erro ao atualizar tarefa, tipo do valor não permitido.")
                expect(res?.body?.error).toBe(true)
                done()
            });
    })

    it(`[${++count}] should return a JSON with the status 200.`, (done) => {
        request(app).put("/task/" + taskId)
            .set('Authorization', `Bearer ${apikey}`)
            .set('userid', userid)
            .send({ val: true })
            .end(function (err, res) {
                expect(res?.body?.status).toBe(200)
                expect(res?.body?.message).toBe('Tarefa atualizada com sucesso.')
                expect(res?.body?.error).toBe(false)
                expect(res?.body?.data).toStrictEqual({})
                done()
            });
    })

    it(`[${++count}] should return a JSON with the status 400.`, (done) => {
        request(app).put("/task/" + "ss1")
            .set('Authorization', `Bearer ${apikey}`)
            .set('userid', userid)
            .send({ val: "do the stank leg" })
            .end(function (err, res) {
                expect(res?.body?.status).toBe(500)
                expect(res?.body?.message).toBe("Houve um erro ao atualizar a tarefa. Contate o suporte.")
                expect(res?.body?.error).toBe(true)
                done()
            });
    })

    it(`[${++count}] should return a JSON with the status 200.`, (done) => {
        request(app).put("/task/" + taskId)
            .set('Authorization', `Bearer ${apikey}`)
            .set('userid', userid)
            .send({ val: 'do not delete ive changed' })
            .end(function (err, res) {
                expect(res?.body?.status).toBe(200)
                expect(res?.body?.message).toBe('Tarefa atualizada com sucesso.')
                expect(res?.body?.error).toBe(false)
                expect(res?.body?.data).toStrictEqual({})
                done()
            });
    })

})

describe("DELETE /task/:id", () => {
    jest.setTimeout(10000)

    it(`[${++count}] should return a JSON with the status 400.`, (done) => {
        request(app).delete("/task/" + taskId)
            .set('Authorization', `Bearer ${apikey}`)
            .set('userid', "  ")
            .end(function (err, res) {
                expect(res?.body?.status).toBe(400)
                expect(res?.body?.message).toBe('Erro ao deletar tarefa, o usuario não foi enviado')
                expect(res?.body?.error).toBe(true)
                expect(res?.body?.data).toStrictEqual({ error: { userid: "" } })
                done()
            });
    })

    it(`[${++count}] should return a JSON with the status 400.`, (done) => {
        request(app).delete("/task/" + "s22")
            .set('Authorization', `Bearer ${apikey}`)
            .set('userid', userid)
            .end(function (err, res) {
                expect(res?.body?.status).toBe(500)
                expect(res?.body?.message).toBe('Erro ao deletar tarefa. Contate o suporte.')
                expect(res?.body?.error).toBe(true)
                expect(res?.body?.data).toStrictEqual({ error: { id: 's22', userid } })
                done()
            });
    })

    it(`[${++count}] should return a JSON with the status 200.`, (done) => {
        request(app).delete("/task/" + taskId)
            .set('Authorization', `Bearer ${apikey}`)
            .set('userid', userid)
            .end(function (err, res) {
                expect(res?.body?.status).toBe(200)
                expect(res?.body?.message).toBe("Tarefa deletada com sucesso")
                expect(res?.body?.error).toBe(false)
                expect(res?.body?.data).toStrictEqual({})
                done()
            });
    })

})

