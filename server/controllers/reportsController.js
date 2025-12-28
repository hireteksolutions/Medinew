import Appointment from '../models/Appointment.js';
import Doctor from '../models/Doctor.js';
import User from '../models/User.js';
import Review from '../models/Review.js';
import { APPOINTMENT_STATUSES, PAYMENT_STATUSES } from '../constants/index.js';

// Helper function to get date ranges based on dateRange parameter
const getDateRanges = (dateRange, customStart, customEnd) => {
  const now = new Date();
  let startDate, endDate;

  switch (dateRange) {
    case 'week':
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), 11, 31);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'custom':
      startDate = customStart ? new Date(customStart) : new Date(now.getFullYear(), now.getMonth(), 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = customEnd ? new Date(customEnd) : new Date(now.getFullYear(), now.getMonth() + 1, 0);
      endDate.setHours(23, 59, 59, 999);
      break;
    default:
      // All time
      startDate = null;
      endDate = null;
  }

  return { startDate, endDate, now };
};

// @desc    Get Most Booked Specialties
// @route   GET /api/admin/reports/specialties
// @access  Private/Admin
export const getMostBookedSpecialties = async (req, res) => {
  try {
    const { dateRange = 'month', startDate: customStart, endDate: customEnd } = req.query;
    const { startDate, endDate } = getDateRanges(dateRange, customStart, customEnd);

    const matchStage = {};
    if (startDate && endDate) {
      matchStage.appointmentDate = { $gte: startDate, $lte: endDate };
    }

    const specialties = await Appointment.aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: 'users',
          localField: 'doctorId',
          foreignField: '_id',
          as: 'doctorUser'
        }
      },
      { $unwind: '$doctorUser' },
      {
        $lookup: {
          from: 'doctors',
          localField: 'doctorUser._id',
          foreignField: 'userId',
          as: 'doctor'
        }
      },
      { $unwind: '$doctor' },
      {
        $group: {
          _id: '$doctor.specialization',
          appointmentCount: { $sum: 1 }
        }
      },
      { $sort: { appointmentCount: -1 } },
      { $limit: 10 }
    ]);

    res.json(specialties.map(s => ({
      specialization: s._id || 'Unknown',
      appointmentCount: s.appointmentCount
    })));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Appointment Statistics
// @route   GET /api/admin/reports/appointments
// @access  Private/Admin
export const getAppointmentStatistics = async (req, res) => {
  try {
    const { dateRange = 'month', startDate: customStart, endDate: customEnd } = req.query;
    const { startDate, endDate, now } = getDateRanges(dateRange, customStart, customEnd);

    const matchStage = {};
    if (startDate && endDate) {
      matchStage.appointmentDate = { $gte: startDate, $lte: endDate };
    }

    // Today's date range
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    // This week
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);

    // This month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    monthStart.setHours(0, 0, 0, 0);

    const [
      total,
      pending,
      completed,
      cancelled,
      today,
      thisWeek,
      thisMonth
    ] = await Promise.all([
      Appointment.countDocuments(matchStage),
      Appointment.countDocuments({ ...matchStage, status: APPOINTMENT_STATUSES.PENDING }),
      Appointment.countDocuments({ ...matchStage, status: APPOINTMENT_STATUSES.COMPLETED }),
      Appointment.countDocuments({ ...matchStage, status: APPOINTMENT_STATUSES.CANCELLED }),
      Appointment.countDocuments({
        appointmentDate: { $gte: todayStart, $lte: todayEnd },
        ...(startDate && endDate ? { appointmentDate: { $gte: startDate, $lte: endDate } } : {})
      }),
      Appointment.countDocuments({
        appointmentDate: { $gte: weekStart },
        ...(startDate && endDate ? { appointmentDate: { $gte: startDate, $lte: endDate } } : {})
      }),
      Appointment.countDocuments({
        appointmentDate: { $gte: monthStart },
        ...(startDate && endDate ? { appointmentDate: { $gte: startDate, $lte: endDate } } : {})
      })
    ]);

    res.json({
      total,
      pending,
      completed,
      cancelled,
      today,
      thisWeek,
      thisMonth
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Revenue Statistics
// @route   GET /api/admin/reports/revenue
// @access  Private/Admin
export const getRevenueStatistics = async (req, res) => {
  try {
    const { dateRange = 'month', startDate: customStart, endDate: customEnd } = req.query;
    const { startDate, endDate, now } = getDateRanges(dateRange, customStart, customEnd);

    const matchStage = { paymentStatus: PAYMENT_STATUSES.COMPLETED };
    if (startDate && endDate) {
      matchStage.appointmentDate = { $gte: startDate, $lte: endDate };
    }

    // Today's date range
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    // This week
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);

    // This month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    monthStart.setHours(0, 0, 0, 0);

    const revenueData = await Appointment.aggregate([
      { $match: { paymentStatus: PAYMENT_STATUSES.COMPLETED } },
      {
        $facet: {
          total: [
            { $match: matchStage },
            { $group: { _id: null, total: { $sum: '$consultationFee' } } }
          ],
          today: [
            {
              $match: {
                paymentStatus: PAYMENT_STATUSES.COMPLETED,
                appointmentDate: { $gte: todayStart, $lte: todayEnd }
              }
            },
            { $group: { _id: null, total: { $sum: '$consultationFee' } } }
          ],
          thisWeek: [
            {
              $match: {
                paymentStatus: PAYMENT_STATUSES.COMPLETED,
                appointmentDate: { $gte: weekStart }
              }
            },
            { $group: { _id: null, total: { $sum: '$consultationFee' } } }
          ],
          thisMonth: [
            {
              $match: {
                paymentStatus: PAYMENT_STATUSES.COMPLETED,
                appointmentDate: { $gte: monthStart }
              }
            },
            { $group: { _id: null, total: { $sum: '$consultationFee' } } }
          ]
        }
      }
    ]);

    const result = revenueData[0];
    res.json({
      total: result.total[0]?.total || 0,
      today: result.today[0]?.total || 0,
      thisWeek: result.thisWeek[0]?.total || 0,
      thisMonth: result.thisMonth[0]?.total || 0
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Doctor Performance Report
// @route   GET /api/admin/reports/doctor-performance
// @access  Private/Admin
export const getDoctorPerformance = async (req, res) => {
  try {
    const { dateRange = 'month', startDate: customStart, endDate: customEnd, limit = 10 } = req.query;
    const { startDate, endDate } = getDateRanges(dateRange, customStart, customEnd);

    const matchStage = {};
    if (startDate && endDate) {
      matchStage.appointmentDate = { $gte: startDate, $lte: endDate };
    }

    const doctorPerformance = await Appointment.aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: 'users',
          localField: 'doctorId',
          foreignField: '_id',
          as: 'doctorUser'
        }
      },
      { $unwind: '$doctorUser' },
      {
        $lookup: {
          from: 'doctors',
          localField: 'doctorUser._id',
          foreignField: 'userId',
          as: 'doctor'
        }
      },
      { $unwind: '$doctor' },
      {
        $group: {
          _id: '$doctorId',
          doctorName: { $first: { $concat: ['$doctorUser.firstName', ' ', '$doctorUser.lastName'] } },
          specialization: { $first: '$doctor.specialization' },
          totalAppointments: { $sum: 1 },
          completedAppointments: {
            $sum: { $cond: [{ $eq: ['$status', APPOINTMENT_STATUSES.COMPLETED] }, 1, 0] }
          },
          totalRevenue: {
            $sum: {
              $cond: [
                { $eq: ['$paymentStatus', PAYMENT_STATUSES.COMPLETED] },
                '$consultationFee',
                0
              ]
            }
          }
        }
      },
      {
        $addFields: {
          completionRate: {
            $cond: [
              { $gt: ['$totalAppointments', 0] },
              { $multiply: [{ $divide: ['$completedAppointments', '$totalAppointments'] }, 100] },
              0
            ]
          }
        }
      },
      { $sort: { totalAppointments: -1 } },
      { $limit: parseInt(limit) }
    ]);

    res.json(doctorPerformance.map(doc => ({
      doctorId: doc._id,
      doctorName: doc.doctorName,
      specialization: doc.specialization,
      totalAppointments: doc.totalAppointments,
      completedAppointments: doc.completedAppointments,
      completionRate: parseFloat(doc.completionRate.toFixed(2)),
      totalRevenue: doc.totalRevenue
    })));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Patient Satisfaction Report
// @route   GET /api/admin/reports/patient-satisfaction
// @access  Private/Admin
export const getPatientSatisfaction = async (req, res) => {
  try {
    const { dateRange = 'month', startDate: customStart, endDate: customEnd } = req.query;
    const { startDate, endDate } = getDateRanges(dateRange, customStart, customEnd);

    const matchStage = {};
    if (startDate && endDate) {
      matchStage.createdAt = { $gte: startDate, $lte: endDate };
    }

    const satisfactionData = await Review.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          averageRating: { $avg: '$rating' },
          fiveStar: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
          fourStar: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
          threeStar: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
          twoStar: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
          oneStar: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } }
        }
      }
    ]);

    const data = satisfactionData[0] || {
      totalReviews: 0,
      averageRating: 0,
      fiveStar: 0,
      fourStar: 0,
      threeStar: 0,
      twoStar: 0,
      oneStar: 0
    };

    const satisfactionRate = data.totalReviews > 0
      ? ((data.fiveStar + data.fourStar) / data.totalReviews * 100).toFixed(2)
      : 0;

    res.json({
      totalReviews: data.totalReviews,
      averageRating: parseFloat((data.averageRating || 0).toFixed(2)),
      satisfactionRate: parseFloat(satisfactionRate),
      ratingDistribution: {
        fiveStar: data.fiveStar,
        fourStar: data.fourStar,
        threeStar: data.threeStar,
        twoStar: data.twoStar,
        oneStar: data.oneStar
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Peak Hours & Busy Periods
// @route   GET /api/admin/reports/peak-hours
// @access  Private/Admin
export const getPeakHours = async (req, res) => {
  try {
    const { dateRange = 'month', startDate: customStart, endDate: customEnd } = req.query;
    const { startDate, endDate } = getDateRanges(dateRange, customStart, customEnd);

    const matchStage = {};
    if (startDate && endDate) {
      matchStage.appointmentDate = { $gte: startDate, $lte: endDate };
    }

    // Peak hours by time slot
    const peakHoursData = await Appointment.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$timeSlot.start',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]);
    
    const peakHours = peakHoursData || [];

    // Busy days of week
    const busyDaysData = await Appointment.aggregate([
      { $match: matchStage },
      {
        $addFields: {
          dayOfWeek: { $dayOfWeek: '$appointmentDate' }
        }
      },
      {
        $group: {
          _id: '$dayOfWeek',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    const busyDays = busyDaysData || [];

    // Map day numbers to names (1 = Sunday, 2 = Monday, ..., 7 = Saturday)
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const busyDaysFormatted = busyDays.map(day => ({
      day: dayNames[day._id - 1] || 'Unknown',
      count: day.count
    }));

    res.json({
      peakHours: peakHours.map(hour => ({
        time: hour._id || 'Unknown',
        count: hour.count
      })),
      busyDays: busyDaysFormatted
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Cancellation Analysis
// @route   GET /api/admin/reports/cancellations
// @access  Private/Admin
export const getCancellationAnalysis = async (req, res) => {
  try {
    const { dateRange = 'month', startDate: customStart, endDate: customEnd } = req.query;
    const { startDate, endDate, now } = getDateRanges(dateRange, customStart, customEnd);

    const matchStage = {};
    if (startDate && endDate) {
      matchStage.appointmentDate = { $gte: startDate, $lte: endDate };
    }

    // This month for comparison
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    monthStart.setHours(0, 0, 0, 0);

    const [totalCancelled, totalAppointments, thisMonthCancelled, thisMonthTotal] = await Promise.all([
      Appointment.countDocuments({ ...matchStage, status: APPOINTMENT_STATUSES.CANCELLED }),
      Appointment.countDocuments(matchStage),
      Appointment.countDocuments({
        appointmentDate: { $gte: monthStart },
        status: APPOINTMENT_STATUSES.CANCELLED
      }),
      Appointment.countDocuments({ appointmentDate: { $gte: monthStart } })
    ]);

    const cancellationRate = totalAppointments > 0
      ? (totalCancelled / totalAppointments * 100).toFixed(2)
      : 0;

    const thisMonthRate = thisMonthTotal > 0
      ? (thisMonthCancelled / thisMonthTotal * 100).toFixed(2)
      : 0;

    res.json({
      totalCancelled,
      totalAppointments,
      cancellationRate: parseFloat(cancellationRate),
      thisMonthCancelled,
      thisMonthTotal,
      thisMonthRate: parseFloat(thisMonthRate)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get No-Show Rate Analysis
// @route   GET /api/admin/reports/no-shows
// @access  Private/Admin
export const getNoShowAnalysis = async (req, res) => {
  try {
    const { dateRange = 'month', startDate: customStart, endDate: customEnd } = req.query;
    const { startDate, endDate, now } = getDateRanges(dateRange, customStart, customEnd);

    const matchStage = {};
    if (startDate && endDate) {
      matchStage.appointmentDate = { $gte: startDate, $lte: endDate };
    }

    // This month for comparison
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    monthStart.setHours(0, 0, 0, 0);

    // For now, we'll consider "no-show" as appointments that were cancelled after the appointment date
    // or appointments with status "pending" that are past their date
    const nowDate = new Date();
    nowDate.setHours(0, 0, 0, 0);

    const pastDate = new Date(nowDate);
    pastDate.setHours(23, 59, 59, 999);

    // Appointments that are past their date and still pending (likely no-shows)
    const noShows = await Appointment.countDocuments({
      ...matchStage,
      appointmentDate: { $lt: pastDate },
      status: APPOINTMENT_STATUSES.PENDING
    });

    const totalScheduled = await Appointment.countDocuments(matchStage);

    // This month
    const thisMonthNoShows = await Appointment.countDocuments({
      appointmentDate: { $gte: monthStart, $lt: pastDate },
      status: APPOINTMENT_STATUSES.PENDING
    });

    const thisMonthScheduled = await Appointment.countDocuments({
      appointmentDate: { $gte: monthStart }
    });

    const noShowRate = totalScheduled > 0
      ? (noShows / totalScheduled * 100).toFixed(2)
      : 0;

    const thisMonthRate = thisMonthScheduled > 0
      ? (thisMonthNoShows / thisMonthScheduled * 100).toFixed(2)
      : 0;

    res.json({
      totalNoShows: noShows,
      totalScheduled,
      noShowRate: parseFloat(noShowRate),
      thisMonthNoShows,
      thisMonthScheduled,
      thisMonthRate: parseFloat(thisMonthRate)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

