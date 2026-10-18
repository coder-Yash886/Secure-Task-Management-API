const { z } = require('zod');

const createProjectSchema = z.object({
  body: z.object({
    title: z.string().trim().min(3, 'Title must be at least 3 characters long').max(200),
    description: z.string().trim().max(2000).optional().default(''),
  }),
});

const updateProjectSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid project ID format'),
  }),
  body: z
    .object({
      title: z.string().trim().min(3, 'Title must be at least 3 characters long').max(200).optional(),
      description: z.string().trim().max(2000).optional(),
    })
    .refine((data) => data.title !== undefined || data.description !== undefined, {
      message: 'At least one field (title or description) must be provided for update',
    }),
});

const addMemberSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid project ID format'),
  }),
  body: z.object({
    email: z.string().trim().email('Invalid email address').toLowerCase(),
    role: z.enum(['member', 'viewer']).optional().default('member'),
  }),
});

const projectIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid project ID format'),
  }),
});

module.exports = {
  createProjectSchema,
  updateProjectSchema,
  addMemberSchema,
  projectIdParamSchema,
};
