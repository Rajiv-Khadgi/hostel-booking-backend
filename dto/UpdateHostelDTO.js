import * as yup from 'yup';

const updateSchema = yup.object({
    name: yup.string(),
    description: yup.string(),
    city: yup.string(),
    area: yup.string(),
    address: yup.string(),
    latitude: yup.number().nullable(),
    longitude: yup.number().nullable(),
    status: yup.string().oneOf(['active', 'inactive'])
});

export class UpdateHostelDTO {
    constructor(data) {
        this.data = data;
    }

    async validate() {
        const validated = await updateSchema.validate(this.data, { abortEarly: false });
        return validated;
    }
}
