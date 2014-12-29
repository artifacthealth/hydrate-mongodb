import Session = require("./session");

interface SessionFactory {

    createSession(): Session;
}

export = SessionFactory;