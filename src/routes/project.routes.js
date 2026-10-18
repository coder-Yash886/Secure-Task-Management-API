const express = require('express');
const projectController = require('../controllers/project.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate');
const {
  createProjectSchema,
  updateProjectSchema,
  addMemberSchema,
  projectIdParamSchema,
} = require('../validators/project.validator');

const router = express.Router();

router.use(authenticate);

router.post('/', validate(createProjectSchema), projectController.create);
router.get('/', projectController.getAll);
router.get('/:id', validate(projectIdParamSchema), projectController.getById);
router.put('/:id', validate(updateProjectSchema), projectController.update);
router.delete('/:id', validate(projectIdParamSchema), projectController.remove);
router.post('/:id/members', validate(addMemberSchema), projectController.addMember);

module.exports = router;
