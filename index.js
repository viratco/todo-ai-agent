import {db} from "./db/index.js"
import { todosTable } from "./db/schema.js"
import {ilike, eq} from "drizzle-orm"
import OpenAi from "openai"
const openai = new OpenAi();
import readlineSync from "readline-sync";

//tools
async function getAllTools() {
    const todos = await db.select().from(todosTable);
    return todos;
}
async function createTodo() {
    const [result] = await db.insert(todosTable).values({
        todo,
    }).returning({
        id: todosTable.id

    })
    return result.id;
}

async function deleteTodoById(id) {
    await db.delete(todosTable).where(eq(todosTable.id,id));
}


async function searchTodo(search) {
    const todos = db.select().from(todosTable).where(ilike(todosTable.todo, search));
    return todos;
}

const tools = {
    getAllTools: getAllTools,
    createTodo: createTodo,
    deleteTodoById: deleteTodoById,
    searchTodo: searchTodo,
}

const SYSTEM_PROMPT = `
You are an AI To-Do List Assistant with START, PLAN, ACTION, Observation and Output State.
Wait for the user prompt and first PLAN using available tools.
After Planning, Take the action with appropriate tools and wait for Observation based on Action.
Once you get the observations, Return the AI response based on START propmt and observations

You are an AI To-Do List Assistant. You can manage tasks by adding, viewing, updating, and deleting +
You must strictly follow the JSON output format.

Todo DB Schema:
id: Int and Primary Key 
todo: String
created_at: Date Time
updated_at: Date Time

Available Tools -
- getAllTodos (): Returns all the Todos from Database
- createTodo (todo: string): Creates a new Todo in the DB and takes todo as a string and return the id of the created todo list
- deleteTodoById(id: string): Deleted the todo by ID given in the DB
- searchTodo (query: string): Searches for all todos matching teh query string using iLike in DB

EXAMPLE - 
{"type": "user", "user": "Add a task for shopping groceries."}
{ "type": "plan", "plan": "I will try to get more context on what user needs to shop." }
{"type": "output", "output": "Can you tell me what all items you want to shop for?" }
{"type": "user" ,"user": "I want to shop for milk, kurkure, lays and choco." }
{ "type": "plan", "plan": "I will use createTodo to create a new Todo in DB." } 
{ "type": "action", "function": "createTodo", "input": "Shopping for milk, kurkure, lays and choco."}
{"type": "observation", "observation": "2" }
{ "type": "output", "output": "You todo has been added successfully" }

`
const messages =[{role: 'system', content: SYSTEM_PROMPT}];

while (true) {
    const query = readlineSync.question('>> ');
    const userMessage = {
        type: 'user',
        user: 'query',

    };
    messages.push({role: 'user', content: JSON. stringify(userMessage)});

    while (true) {
        const chat = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: messages,
            response_format: { type: "json_object" },
        });
        const result = chat.choices[0].message.content;
        messages.push ({role: 'assistant', content: result});

        const action = JSON.parse(result);
        if(action.type === 'output') {
            console.log (`bot: ${action.output}`);
            break;
        }else if(action.type ==='action') {
            const fn = tools[action.function];
            if (!fn) throw new Error("invalid! tool call");
            const observation = await fn(action.input);
            const observationMessage = {
                type : 'observation',
                observation: observation,
            }
            messages.push({role: 'developer', content: JSON.stringify(observationMessage)});
        
        }
    }
}