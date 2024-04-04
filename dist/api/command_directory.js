"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandDirectory = void 0;
const command_1 = require("../command");
const user_1 = require("../model/user");
class CommandDirectory {
    constructor() {
        this.commandHandlersMap = {
            [command_1.StartCommandHandler.command]: {
                constructor: command_1.StartCommandHandler,
                description: "",
            },
            [command_1.AuthenticateCommandHandler.command]: {
                constructor: command_1.AuthenticateCommandHandler,
                description: "Ti autentica, necessario per poter usare il bot",
            },
            [command_1.StopCommandHandler.command]: {
                constructor: command_1.StopCommandHandler,
                description: "Interrompe il comando attualmente in esecuzione",
            },
            [command_1.ListCoursesCommandHandler.command]: {
                constructor: command_1.ListCoursesCommandHandler,
                description: "Restituisce una lista di tutti i corsi disponibili (non terminati)",
            },
            [command_1.CourseInfoCommandHandler.command]: {
                constructor: command_1.CourseInfoCommandHandler,
                description: "Restituisce le informazioni sul corso selezionato",
            },
            [command_1.FollowCommandHandler.command]: {
                constructor: command_1.FollowCommandHandler,
                description: "Permette di seguire il corso selezionato",
            },
            [command_1.UnfollowCommandHandler.command]: {
                constructor: command_1.UnfollowCommandHandler,
                description: "Permette di smettere di seguire il corso selezionato",
            },
            [command_1.ListFollowingCommandHandler.command]: {
                constructor: command_1.ListFollowingCommandHandler,
                description: "Restituisce una lista di tutti i corsi seguiti",
            },
            [command_1.ProfinfoCommandHandler.command]: {
                constructor: command_1.ProfinfoCommandHandler,
                description: "Ricerca la informazioni su un professore in base al suo nome",
            },
            [command_1.ToProfCommandHandler.command]: {
                constructor: command_1.ToProfCommandHandler,
                description: "Invia un messaggio al professore selezionato",
            },
        };
        /**
         * contiene le chiavi dei comandi che sono disponibili per l'utente
         * non autenticato
         */
        this.anonymousUserCommands = [
            command_1.StartCommandHandler.command,
            command_1.AuthenticateCommandHandler.command,
            command_1.StopCommandHandler.command,
        ];
        /**
         * contiene le chiavi dei comandi che sono disponibili per l'utente
         * autenticato con ruolo di studente
         */
        this.studentCommands = [
            ...this.anonymousUserCommands,
            command_1.ListCoursesCommandHandler.command,
            command_1.CourseInfoCommandHandler.command,
            command_1.FollowCommandHandler.command,
            command_1.UnfollowCommandHandler.command,
            command_1.ListFollowingCommandHandler.command,
            command_1.ProfinfoCommandHandler.command,
            command_1.ToProfCommandHandler.command,
        ];
        this.professorCommands = [];
    }
    getConstructor(command) {
        return this.commandHandlersMap[command]
            ? this.commandHandlersMap[command].constructor
            : null;
    }
    getCommandsDescriptions(keys) {
        return keys.map((command) => {
            return {
                text: command,
                description: this.commandHandlersMap[command].description,
            };
        });
    }
    getCommandList(user) {
        if (!user) {
            return this.getCommandsDescriptions(this.anonymousUserCommands);
        }
        const commands = user.role === user_1.UserRole.student
            ? this.studentCommands
            : this.professorCommands;
        return this.getCommandsDescriptions(commands);
    }
}
exports.CommandDirectory = CommandDirectory;
//# sourceMappingURL=command_directory.js.map