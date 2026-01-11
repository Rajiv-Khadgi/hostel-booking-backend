import * as yup from 'yup';
import dayjs from 'dayjs';

const bookingSchema = yup.object({
    room_id: yup.number().required(),
    start_date: yup.date().required(),
    months: yup.number().min(1, 'Minimum booking is 1 month').required()
});

export class CreateBookingDTO {
    constructor(data) {
        this.data = data;
    }

    async validate() {
        const validated = await bookingSchema.validate(this.data, { abortEarly: false });
        const start = dayjs(validated.start_date);
        const end = start.add(validated.months, 'month');
        validated.end_date = end.format('YYYY-MM-DD');
        return validated;
    }
}
