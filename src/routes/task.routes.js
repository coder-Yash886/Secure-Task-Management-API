const express = require('express');
const taskController = require('../controllers/task.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate');
const {
  createTaskSchema,
  updateTaskSchema,
  updateStatusSchema,
  taskQuerySchema,
  taskIdParamSchema,
} = require('../validators/task.validator');

const router = express.Router({ mergeParams: true });

// Require authentication for all task routes
router.use(authenticate);

router.post('/', validate(createTaskSchema), taskController.create);
router.get('/', validate(taskQuerySchema), taskController.getAll);
router.get('/:id', validate(taskIdParamSchema), taskController.getById);
router.put('/:id', validate(updateTaskSchema), taskController.update);
router.patch('/:id/status', validate(updateStatusSchema), taskController.updateStatus);
router.get('/:id/history', validate(taskIdParamSchema), taskController.getHistory);
router.delete('/:id', validate(taskIdParamSchema), taskController.remove);

module.exports = router;
