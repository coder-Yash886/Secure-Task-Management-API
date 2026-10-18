const projectService = require('../services/project.service');
const { sendSuccess } = require('../utils/response');

const create = async (req, res, next) => {
  try {
    const { title, description } = req.body;
    const project = await projectService.createProject({
      title,
      description,
      ownerId: req.user.id,
    });
    return sendSuccess(res, 201, 'Project created successfully', project);
  } catch (error) {
    next(error);
  }
};

const getAll = async (req, res, next) => {
  try {
    const projects = await projectService.getUserProjects(req.user.id);
    return sendSuccess(res, 200, 'Projects retrieved successfully', projects);
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const project = await projectService.getProjectById(req.params.id, req.user.id);
    return sendSuccess(res, 200, 'Project details retrieved successfully', project);
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const updated = await projectService.updateProject(req.params.id, req.user.id, req.body);
    return sendSuccess(res, 200, 'Project updated successfully', updated);
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const result = await projectService.deleteProject(req.params.id, req.user.id);
    return sendSuccess(res, 200, result.message);
  } catch (error) {
    next(error);
  }
};

const addMember = async (req, res, next) => {
  try {
    const result = await projectService.addMember(req.params.id, req.user.id, req.body);
    return sendSuccess(res, 201, 'Member added to project successfully', result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  create,
  getAll,
  getById,
  update,
  remove,
  addMember,
};
