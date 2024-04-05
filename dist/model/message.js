"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageStatus = exports.MessageTypeMapping = exports.MessageType = void 0;
exports.MessageType = {
    meeting_request: {
        id: 1,
        description: "Richiesta di ricevimento",
    },
    course_info: {
        id: 2,
        description: "Informazioni su un corso tenuto dal docente",
    },
    other: {
        id: 3,
        description: "Altro",
    },
};
//TODO capire se MessageType e MessageTypeMapping possono essere uniti
exports.MessageTypeMapping = {
    1: {
        description: "Richiesta di ricevimento"
    },
    2: {
        description: "Informazioni su un corso tenuto dal docente"
    },
    3: {
        description: "Altro"
    }
};
exports.MessageStatus = {
    sent: 1,
    read: 2
};
//# sourceMappingURL=message.js.map