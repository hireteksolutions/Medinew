import Message from '../models/Message.js';
import User from '../models/User.js';
import Doctor from '../models/Doctor.js';
import { USER_ROLES, MESSAGE_STATUSES, MESSAGE_PRIORITIES } from '../constants/index.js';
import { MESSAGE_MESSAGES, AUTHZ_MESSAGES } from '../constants/messages.js';
import { getPaginationParams, buildPaginationMeta } from '../utils/pagination.js';

// ============================================
// PATIENT MESSAGE FUNCTIONS
// ============================================

// @desc    Create a new message/problem submission
// @route   POST /api/messages
// @access  Private/Patient
export const createMessage = async (req, res) => {
  try {
    const {
      doctorId,
      specialization,
      subject,
      description,
      symptomsDuration,
      priority,
      attachments,
      contactPreference
    } = req.body;

    // Validate required fields
    if (!subject || !description) {
      return res.status(400).json({ message: MESSAGE_MESSAGES.SUBJECT_AND_DESCRIPTION_REQUIRED });
    }

    // If doctorId is provided, verify doctor exists
    if (doctorId) {
      const doctor = await Doctor.findOne({ userId: doctorId, isApproved: true });
      if (!doctor) {
        return res.status(404).json({ message: MESSAGE_MESSAGES.DOCTOR_NOT_FOUND_OR_NOT_APPROVED });
      }
    }

    const message = await Message.create({
      patientId: req.user._id,
      doctorId: doctorId || null,
      specialization: specialization || null,
      subject,
      description,
      symptomsDuration: symptomsDuration || null,
      priority: priority || MESSAGE_PRIORITIES.MEDIUM,
      attachments: attachments || [],
      contactPreference: contactPreference || 'in_app',
      status: MESSAGE_STATUSES.PENDING
    });

    const populatedMessage = await Message.findById(message._id)
      .populate('patientId', 'firstName lastName email phone profileImage')
      .populate('doctorId', 'firstName lastName specialization profileImage');

    res.status(201).json({
      message: MESSAGE_MESSAGES.MESSAGE_CREATED_SUCCESSFULLY,
      data: populatedMessage
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all messages for a patient
// @route   GET /api/messages
// @access  Private/Patient
export const getPatientMessages = async (req, res) => {
  try {
    const { status, priority } = req.query;
    
    // Get pagination parameters
    const { limit, offset } = getPaginationParams(req);

    let query = { patientId: req.user._id };

    if (status) {
      query.status = status;
    }

    if (priority) {
      query.priority = priority;
    }

    // Get total count before pagination
    const total = await Message.countDocuments(query);

    const messages = await Message.find(query)
      .populate('doctorId', 'firstName lastName specialization profileImage')
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit);

    // Build pagination metadata
    const pagination = buildPaginationMeta(total, limit, offset);

    res.json({
      messages,
      pagination
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get a single message (patient)
// @route   GET /api/messages/:id
// @access  Private/Patient
export const getMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id)
      .populate('patientId', 'firstName lastName email phone profileImage')
      .populate('doctorId', 'firstName lastName specialization profileImage')
      .populate('response.respondedBy', 'firstName lastName');

    if (!message) {
      return res.status(404).json({ message: MESSAGE_MESSAGES.MESSAGE_NOT_FOUND });
    }

    // Check authorization - only patient who created it can view
    if (message.patientId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: AUTHZ_MESSAGES.NOT_AUTHORIZED });
    }

    // Mark as read if not already read
    if (message.status === MESSAGE_STATUSES.PENDING && !message.readAt) {
      message.status = MESSAGE_STATUSES.READ;
      message.readAt = new Date();
      await message.save();
    }

    res.json({ data: message });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a message (patient can update before doctor responds)
// @route   PUT /api/messages/:id
// @access  Private/Patient
export const updateMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({ message: MESSAGE_MESSAGES.MESSAGE_NOT_FOUND });
    }

    // Check authorization
    if (message.patientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: AUTHZ_MESSAGES.NOT_AUTHORIZED });
    }

    // Can only update if not responded to
    if (message.status === MESSAGE_STATUSES.RESPONDED || message.status === MESSAGE_STATUSES.CLOSED) {
      return res.status(400).json({ message: MESSAGE_MESSAGES.CANNOT_UPDATE_RESPONDED_MESSAGE });
    }

    const {
      subject,
      description,
      symptomsDuration,
      priority,
      attachments,
      contactPreference,
      doctorId,
      specialization
    } = req.body;

    if (subject) message.subject = subject;
    if (description) message.description = description;
    if (symptomsDuration !== undefined) message.symptomsDuration = symptomsDuration;
    if (priority) message.priority = priority;
    if (attachments) message.attachments = attachments;
    if (contactPreference) message.contactPreference = contactPreference;
    if (doctorId) {
      const doctor = await Doctor.findOne({ userId: doctorId, isApproved: true });
      if (!doctor) {
        return res.status(404).json({ message: MESSAGE_MESSAGES.DOCTOR_NOT_FOUND_OR_NOT_APPROVED });
      }
      message.doctorId = doctorId;
    }
    if (specialization) message.specialization = specialization;

    await message.save();

    const updatedMessage = await Message.findById(message._id)
      .populate('patientId', 'firstName lastName email phone profileImage')
      .populate('doctorId', 'firstName lastName specialization profileImage');

    res.json({
      message: MESSAGE_MESSAGES.MESSAGE_UPDATED_SUCCESSFULLY,
      data: updatedMessage
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a message
// @route   DELETE /api/messages/:id
// @access  Private/Patient
export const deleteMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({ message: MESSAGE_MESSAGES.MESSAGE_NOT_FOUND });
    }

    // Check authorization
    if (message.patientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: AUTHZ_MESSAGES.NOT_AUTHORIZED });
    }

    await Message.findByIdAndDelete(req.params.id);

    res.json({ message: MESSAGE_MESSAGES.MESSAGE_DELETED_SUCCESSFULLY });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============================================
// DOCTOR MESSAGE FUNCTIONS
// ============================================

// @desc    Get messages for doctor (admin/doctor access)
// @route   GET /api/messages/doctor
// @access  Private/Doctor or Admin
export const getDoctorMessages = async (req, res) => {
  try {
    const { status, priority, specialization } = req.query;
    
    // Get pagination parameters
    const { limit, offset } = getPaginationParams(req);

    let query = {};

    // If doctor, only show messages assigned to them or unassigned
    if (req.user.role === USER_ROLES.DOCTOR) {
      const doctor = await Doctor.findOne({ userId: req.user._id });
      if (!doctor) {
        return res.status(404).json({ message: MESSAGE_MESSAGES.DOCTOR_PROFILE_NOT_FOUND });
      }
      query.$or = [
        { doctorId: req.user._id },
        { doctorId: null, specialization: doctor.specialization },
        { doctorId: null, specialization: null }
      ];
    }

    if (status) {
      query.status = status;
    }

    if (priority) {
      query.priority = priority;
    }

    if (specialization) {
      query.specialization = specialization;
    }

    // Get total count before pagination
    const total = await Message.countDocuments(query);

    const messages = await Message.find(query)
      .populate('patientId', 'firstName lastName email phone profileImage')
      .populate('doctorId', 'firstName lastName specialization profileImage')
      .sort({ priority: -1, createdAt: -1 })
      .skip(offset)
      .limit(limit);

    // Build pagination metadata
    const pagination = buildPaginationMeta(total, limit, offset);

    res.json({
      messages,
      pagination
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Respond to a message (doctor/admin only)
// @route   POST /api/messages/:id/respond
// @access  Private/Doctor or Admin
export const respondToMessage = async (req, res) => {
  try {
    const { responseMessage } = req.body;

    if (!responseMessage) {
      return res.status(400).json({ message: MESSAGE_MESSAGES.RESPONSE_MESSAGE_REQUIRED });
    }

    const message = await Message.findById(req.params.id)
      .populate('patientId', 'firstName lastName email');

    if (!message) {
      return res.status(404).json({ message: MESSAGE_MESSAGES.MESSAGE_NOT_FOUND });
    }

    // Check if doctor is assigned to this message or if admin
    if (req.user.role === USER_ROLES.DOCTOR) {
      if (message.doctorId && message.doctorId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: AUTHZ_MESSAGES.NOT_AUTHORIZED });
      }
    }

    message.response = {
      message: responseMessage,
      respondedBy: req.user._id,
      respondedAt: new Date()
    };
    message.status = MESSAGE_STATUSES.RESPONDED;

    await message.save();

    const updatedMessage = await Message.findById(message._id)
      .populate('patientId', 'firstName lastName email phone profileImage')
      .populate('doctorId', 'firstName lastName specialization profileImage')
      .populate('response.respondedBy', 'firstName lastName');

    res.json({
      message: MESSAGE_MESSAGES.MESSAGE_RESPONDED_SUCCESSFULLY,
      data: updatedMessage
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============================================
// ADDITIONAL DOCTOR MESSAGE FUNCTIONS (For /api/doctor/messages routes)
// ============================================

// @desc    Get all messages for a doctor (enhanced version with more filters)
// @route   GET /api/doctor/messages
// @access  Private/Doctor
export const getMessages = async (req, res) => {
  try {
    const { status, priority, startDate, endDate, search } = req.query;
    
    // Get pagination parameters
    const { limit, offset } = getPaginationParams(req);
    
    const doctorId = req.user._id;

    let query = { doctorId };

    // Status filter
    if (status) {
      query.status = status;
    }

    // Priority filter
    if (priority) {
      query.priority = priority;
    }

    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const endDateObj = new Date(endDate);
        endDateObj.setHours(23, 59, 59, 999);
        query.createdAt.$lte = endDateObj;
      }
    }

    // Search filter (by patient name or keywords in subject/description)
    if (search) {
      const patientUsers = await User.find({
        $or: [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');

      const patientIds = patientUsers.map(u => u._id);

      query.$or = [
        { patientId: { $in: patientIds } },
        { subject: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Get total count before pagination
    const total = await Message.countDocuments(query);

    const messages = await Message.find(query)
      .populate('patientId', 'firstName lastName email phone profileImage')
      .populate('response.respondedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit);

    // Build pagination metadata
    const pagination = buildPaginationMeta(total, limit, offset);

    res.json({
      messages,
      pagination
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single message (doctor version)
// @route   GET /api/doctor/messages/:id
// @access  Private/Doctor
export const getDoctorMessage = async (req, res) => {
  try {
    const message = await Message.findOne({
      _id: req.params.id,
      doctorId: req.user._id
    })
      .populate('patientId', 'firstName lastName email phone profileImage dateOfBirth gender')
      .populate('response.respondedBy', 'firstName lastName');

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    res.json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark message as read
// @route   PUT /api/doctor/messages/:id/read
// @access  Private/Doctor
export const markAsRead = async (req, res) => {
  try {
    const message = await Message.findOne({
      _id: req.params.id,
      doctorId: req.user._id
    });

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (!message.readAt) {
      message.readAt = new Date();
      if (message.status === MESSAGE_STATUSES.PENDING) {
        message.status = MESSAGE_STATUSES.READ;
      }
      await message.save();
    }

    res.json({ message: 'Message marked as read', readAt: message.readAt });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Respond to message (enhanced version with attachments)
// @route   POST /api/doctor/messages/:id/respond
// @access  Private/Doctor
export const respondToMessageWithAttachments = async (req, res) => {
  try {
    const { responseMessage, attachments } = req.body;

    if (!responseMessage || !responseMessage.trim()) {
      return res.status(400).json({ message: MESSAGE_MESSAGES.RESPONSE_MESSAGE_REQUIRED });
    }

    const message = await Message.findOne({
      _id: req.params.id,
      doctorId: req.user._id
    });

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Update message with response
    message.response = {
      message: responseMessage.trim(),
      respondedBy: req.user._id,
      respondedAt: new Date(),
      attachments: attachments || []
    };
    message.status = MESSAGE_STATUSES.RESPONDED;

    if (!message.readAt) {
      message.readAt = new Date();
    }

    await message.save();

    const updatedMessage = await Message.findById(message._id)
      .populate('patientId', 'firstName lastName email phone profileImage')
      .populate('response.respondedBy', 'firstName lastName');

    res.json({ 
      message: 'Response sent successfully', 
      data: updatedMessage 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Archive message
// @route   PUT /api/doctor/messages/:id/archive
// @access  Private/Doctor
export const archiveMessage = async (req, res) => {
  try {
    const message = await Message.findOne({
      _id: req.params.id,
      doctorId: req.user._id
    });

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    message.status = MESSAGE_STATUSES.CLOSED;
    await message.save();

    res.json({ message: 'Message archived successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get unread messages count
// @route   GET /api/doctor/messages/unread/count
// @access  Private/Doctor
export const getUnreadCount = async (req, res) => {
  try {
    const count = await Message.countDocuments({
      doctorId: req.user._id,
      status: { $in: [MESSAGE_STATUSES.PENDING, MESSAGE_STATUSES.READ] }
    });

    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark multiple messages as read
// @route   PUT /api/doctor/messages/mark-read
// @access  Private/Doctor
export const markMultipleAsRead = async (req, res) => {
  try {
    const { messageIds } = req.body;

    if (!messageIds || !Array.isArray(messageIds)) {
      return res.status(400).json({ message: MESSAGE_MESSAGES.MESSAGE_IDS_ARRAY_REQUIRED });
    }

    const result = await Message.updateMany(
      {
        _id: { $in: messageIds },
        doctorId: req.user._id
      },
      {
        $set: {
          readAt: new Date(),
          status: MESSAGE_STATUSES.READ
        }
      }
    );

    res.json({ 
      message: `${result.modifiedCount} messages marked as read`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
