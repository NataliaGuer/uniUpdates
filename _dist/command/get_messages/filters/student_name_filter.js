"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StudentNameFilter = void 0;
const prismaWrapper_1 = require("../../../utils/db/prismaWrapper");
class StudentNameFilter {
    getFilterCaption() {
        return {
            text: "Inserisci il nome dello studente o una sua parte",
        };
    }
    handleValue(value) {
        const prisma = prismaWrapper_1.PrismaClientWrapper.getInstance();
        return prisma.sent_messages.findMany({
            where: {
                from: {
                    contains: value
                }
            }
        });
    }
}
exports.StudentNameFilter = StudentNameFilter;
StudentNameFilter.key = "student_name";
StudentNameFilter.description = "Nome studente";
//# sourceMappingURL=student_name_filter.js.map