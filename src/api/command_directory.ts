import { user } from "@prisma/client";
import {
    StartCommandHandler,
    AuthenticateCommandHandler,
    StopCommandHandler,
    CommandHandlerConstructor,
    ListCoursesCommandHandler,
    CourseInfoCommandHandler,
    FollowCommandHandler,
    UnfollowCommandHandler,
    ListFollowingCommandHandler,
    ProfinfoCommandHandler,
    ToProfCommandHandler,
    GetMessagesCommandHandler,
    ReplayCommandHandler,
} from "../command";
import { UserRole } from "../model/user";

export class CommandDirectory {
    private commandHandlersMap: Record<string, CommandInfo> = {
        [StartCommandHandler.command]: {
            constructor: StartCommandHandler,
            description: "",
        },
        [AuthenticateCommandHandler.command]: {
            constructor: AuthenticateCommandHandler,
            description: "Ti autentica, necessario per poter usare il bot",
        },
        [StopCommandHandler.command]: {
            constructor: StopCommandHandler,
            description: "Interrompe il comando attualmente in esecuzione",
        },
        [ListCoursesCommandHandler.command]: {
            constructor: ListCoursesCommandHandler,
            description:
                "Restituisce una lista di tutti i corsi disponibili (non terminati)",
        },
        [CourseInfoCommandHandler.command]: {
            constructor: CourseInfoCommandHandler,
            description: "Restituisce le informazioni sul corso selezionato",
        },
        [FollowCommandHandler.command]: {
            constructor: FollowCommandHandler,
            description: "Permette di seguire il corso selezionato",
        },
        [UnfollowCommandHandler.command]: {
            constructor: UnfollowCommandHandler,
            description: "Permette di smettere di seguire il corso selezionato",
        },
        [ListFollowingCommandHandler.command]: {
            constructor: ListFollowingCommandHandler,
            description: "Restituisce una lista di tutti i corsi seguiti",
        },
        [ProfinfoCommandHandler.command]: {
            constructor: ProfinfoCommandHandler,
            description:
                "Ricerca la informazioni su un professore in base al suo nome",
        },
        [ToProfCommandHandler.command]: {
            constructor: ToProfCommandHandler,
            description: "Invia un messaggio al professore selezionato",
        },
        [GetMessagesCommandHandler.command]: {
            constructor: GetMessagesCommandHandler,
            description:
                "Restituisce una lista di tutti i messaggi ricevuti dagli studenti",
        },
        [ReplayCommandHandler.command]: {
            constructor: ReplayCommandHandler,
            description:
                "Permette di rispondere a un messaggio inviato da uno studente",
        }
    };

    /**
     * contiene le chiavi dei comandi che sono disponibili per l'utente
     * non autenticato
     */
    private anonymousUserCommands: string[] = [
        StartCommandHandler.command,
        AuthenticateCommandHandler.command,
        StopCommandHandler.command,
    ];

    /**
     * contiene le chiavi dei comandi che sono disponibili per l'utente
     * autenticato con ruolo di studente
     */
    private studentCommands: string[] = [
        ...this.anonymousUserCommands,
        ListCoursesCommandHandler.command,
        CourseInfoCommandHandler.command,
        FollowCommandHandler.command,
        UnfollowCommandHandler.command,
        ListFollowingCommandHandler.command,
        ProfinfoCommandHandler.command,
        ToProfCommandHandler.command,
    ];

    private professorCommands: string[] = [
        ...this.anonymousUserCommands,
        GetMessagesCommandHandler.command,
        ReplayCommandHandler.command
    ];

    getConstructor(command: string): CommandHandlerConstructor | null {
        return this.commandHandlersMap[command]
            ? this.commandHandlersMap[command].constructor
            : null;
    }

    private getCommandsDescriptions(
        keys: string[]
    ): { text: string; description: string }[] {
        return keys.map((command) => {
            return {
                text: command,
                description: this.commandHandlersMap[command].description,
            };
        });
    }

    getCommandList(user: user): { text: string; description: string }[] {
        if (!user) {
            return this.getCommandsDescriptions(this.anonymousUserCommands);
        }

        const commands =
            user.role === UserRole.student
                ? this.studentCommands
                : this.professorCommands;
        return this.getCommandsDescriptions(commands);
    }
}

interface CommandInfo {
    constructor: CommandHandlerConstructor;
    description: string;
}
