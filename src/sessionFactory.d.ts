import {Session} from "./session";

export interface SessionFactory {

    createSession(): Session;
}
