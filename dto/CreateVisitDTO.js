import * as yup from 'yup';

const visitSchema = yup.object({
    hostel_id: yup.number().required('Hostel id is required'),
    visit_date: yup.date()
        .required('Visit date is required')
        .typeError('Visit date must be a valid date')
        .test('is-future-date', 'Visit date must be at least tomorrow', (value) => {
            if (!value) return false;
            const selected = new Date(value);
            selected.setHours(0, 0, 0, 0);

            const tomorrow = new Date();
            tomorrow.setHours(0, 0, 0, 0);
            tomorrow.setDate(tomorrow.getDate() + 1);

            return selected >= tomorrow;
        })
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
