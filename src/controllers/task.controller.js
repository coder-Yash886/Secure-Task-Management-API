const taskService = require('../services/task.service');
const { sendSuccess, sendPaginated } = require('../utils/response');

const create = async (req, res, next) => {
  try {
    const projectId = req.params.projectId || req.body.projectId;
    const task = await taskService.createTask({
      projectId,
      title: req.body.title,
      description: req.body.description,
      status: req.body.status,
      assignedTo: req.body.assignedTo,
      dueDate: req.body.dueDate,
      userId: req.user.id,
    });
    return sendSuccess(res, 201, 'Task created successfully', task);
  } catch (error) {
    next(error);
  }
};

const getAll = async (req, res, next) => {
  try {
    const projectId = req.params.projectId || req.query.projectId;
    const options = {
      projectId,
      status: req.query.status,
      assignedTo: req.query.assignedTo,
      search: req.query.search,
      sortBy: req.query.sortBy,
      order: req.query.order,
      page: req.query.page,
      limit: req.query.limit,
    };
    const { tasks, pagination } = await taskService.getTasks(req.user.id, options);
    return sendPaginated(res, 200, 'Tasks retrieved successfully', tasks, pagination);
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const task = await taskService.getTaskById(req.params.id, req.user.id);
    return sendSuccess(res, 200, 'Task retrieved successfully', task);
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const updated = await taskService.updateTask(req.params.id, req.user.id, req.body);
    return sendSuccess(res, 200, 'Task updated successfully', updated);
  } catch (error) {
    next(error);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const updated = await taskService.updateTaskStatus(req.params.id, req.user.id, status);
    return sendSuccess(res, 200, 'Task status updated and activity logged', updated);
  } catch (error) {
    next(error);
  }
};

const getHistory = async (req, res, next) => {
  try {
    const history = await taskService.getTaskHistory(req.params.id, req.user.id);
    return sendSuccess(res, 200, 'Task activity history retrieved successfully', history);
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const result = await taskService.deleteTask(req.params.id, req.user.id);
    return sendSuccess(res, 200, result.message);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  create,
  getAll,
  getById,
  update,
  updateStatus,
  getHistory,
  remove,
};
