import * as yup from 'yup';

const visitSchema = yup.object({
    hostel_id: yup.number().required(),
    visit_date: yup.date().required()
});

export class CreateVisitDTO {
    constructor(data) {
        this.data = data;
    }

    async validate() {
        await visitSchema.validate(this.data, { abortEarly: false });
        return this.data;
    }
}
