import * as yup from 'yup';

const updateRoomSchema = yup.object({
    room_type: yup
        .string()
        .oneOf(['SINGLE', 'DOUBLE', 'TRIPLE', 'DORM'])
        .optional(),
    price: yup.number().positive().optional(),
    total_beds: yup.number().integer().positive().optional(),
    available_beds: yup.number().integer().min(0).optional(),
    status: yup.string().oneOf(['AVAILABLE','FULL','INACTIVE']).optional(),
});

export class UpdateRoomDTO {
    constructor(data) {
        this.data = data;
    }

    async validate() {
        const validated = await updateRoomSchema.validate(this.data, { abortEarly: false });
        return validated;
    }
}
