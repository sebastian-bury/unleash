import { createSchemaObject, CreateSchemaType } from '../types';
import { parametersSchema } from './parameters-schema';
import { constraintSchema } from './constraint-schema';

const schema = {
    type: 'object',
    additionalProperties: false,
    required: ['name', 'constraints', 'parameters'],
    properties: {
        name: {
            type: 'string',
        },
        constraints: {
            type: 'array',
            items: constraintSchema,
        },
        parameters: parametersSchema,
    },
} as const;

export type UpdateStrategySchema = CreateSchemaType<typeof schema>;

export const updateStrategySchema = createSchemaObject(schema);
