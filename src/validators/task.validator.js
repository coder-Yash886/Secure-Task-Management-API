const { z } = require('zod');

const taskStatusEnum = z.enum(['TODO', 'IN_PROGRESS', 'DONE']);

const createTaskSchema = z.object({
  body: z.object({
    projectId: z.string().uuid('Invalid project ID format').optional(),
    title: z.string().trim().min(3, 'Title must be at least 3 characters long').max(255),
    description: z.string().trim().max(5000).optional().default(''),
    status: taskStatusEnum.optional().default('TODO'),
    assignedTo: z.string().uuid('Invalid assigned user ID').nullable().optional(),
    dueDate: z.string().datetime({ offset: true }).nullable().optional(),
  }),
});

const updateTaskSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid task ID format'),
  }),
  body: z
    .object({
      title: z.string().trim().min(3, 'Title must be at least 3 characters long').max(255).optional(),
      description: z.string().trim().max(5000).optional(),
      assignedTo: z.string().uuid('Invalid assigned user ID').nullable().optional(),
      dueDate: z.string().datetime({ offset: true }).nullable().optional(),
    })
    .refine((data) => Object.values(data).some((val) => val !== undefined), {
      message: 'At least one field must be provided for update',
    }),
});

const updateStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid task ID format'),
  }),
  body: z.object({
    status: taskStatusEnum,
  }),
});

const taskQuerySchema = z.object({
  query: z.object({
    projectId: z.string().uuid('Invalid project ID format').optional(),
    status: taskStatusEnum.optional(),
    assignedTo: z.string().uuid('Invalid user ID').optional(),
    search: z.string().trim().max(100).optional(),
    sortBy: z.enum(['created_at', 'due_date', 'status', 'title']).optional().default('created_at'),
    order: z.enum(['asc', 'desc']).optional().default('desc'),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  }),
});

const taskIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid task ID format'),
  }),
});

module.exports = {
  createTaskSchema,
  updateTaskSchema,
  updateStatusSchema,
  taskQuerySchema,
  taskIdParamSchema,
};
