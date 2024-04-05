"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListCoursesCommandHandler = void 0;
const base_1 = require("./base");
class ListCoursesCommandHandler extends base_1.BaseCommandHandler {
    handle(req) {
        return this.prisma.course.findMany({
            where: {
                end_date: {
                    gt: new Date()
                }
            }
        })
            .then((courses) => {
            return {
                success: true,
                text: "I corsi disponibili sono:\n" + courses.map((c) => { return `- ${c.name} (id: ${c.id})`; }).join("\n"),
            };
        });
    }
}
exports.ListCoursesCommandHandler = ListCoursesCommandHandler;
//# sourceMappingURL=list_courses.js.map