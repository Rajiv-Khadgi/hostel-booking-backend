import * as yup from 'yup';

const roomSchema = yup.object({
    hostel_id: yup.number().required('Hostel is required'),
    room_type: yup.string().oneOf(['SINGLE','DOUBLE','TRIPLE','DORM']).required('Room type is required'),
    price: yup.number().required('Price is required').positive(),
    total_beds: yup.number().required('Total beds is required').min(1),
});

export class CreateRoomDTO {
    constructor(data) {
        this.data = data;
    }

    async validate() {
        const validated = await roomSchema.validate(this.data, { abortEarly: false });

        // Set available_beds initially equal to total_beds
        validated.available_beds = validated.total_beds;

        // Status initially available
        validated.status = 'AVAILABLE';

        return validated;
    }
}
