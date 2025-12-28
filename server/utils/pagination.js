/**
 * Pagination Utility
 * Provides consistent pagination handling across all APIs
 */

/**
 * Parse pagination parameters from request query
 * @param {Object} req - Express request object
 * @param {Object} options - Options object
 * @param {Number} options.defaultLimit - Default limit per page (default: 5)
 * @param {Number} options.maxLimit - Maximum allowed limit (default: 100)
 * @returns {Object} Pagination parameters { limit, offset, page }
 */
export const getPaginationParams = (req, options = {}) => {
  const { defaultLimit = 5, maxLimit = 100 } = options;

  // Parse limit (per page)
  let limit = parseInt(req.query.limit) || defaultLimit;
  limit = Math.min(Math.max(1, limit), maxLimit); // Ensure between 1 and maxLimit

  // Parse offset (number of records to skip)
  let offset = parseInt(req.query.offset) || 0;
  offset = Math.max(0, offset); // Ensure non-negative

  // Calculate page number from offset (for display purposes)
  const page = offset > 0 ? Math.floor(offset / limit) + 1 : 1;

  return { limit, offset, page };
};

/**
 * Build pagination metadata response
 * @param {Number} total - Total number of records
 * @param {Number} limit - Limit per page
 * @param {Number} offset - Current offset
 * @returns {Object} Pagination metadata
 */
export const buildPaginationMeta = (total, limit, offset) => {
  const page = offset > 0 ? Math.floor(offset / limit) + 1 : 1;
  const pages = Math.ceil(total / limit);
  const hasNextPage = offset + limit < total;
  const hasPreviousPage = offset > 0;

  return {
    total,
    limit,
    offset,
    page,
    pages,
    hasNextPage,
    hasPreviousPage,
    nextOffset: hasNextPage ? offset + limit : null,
    previousOffset: hasPreviousPage ? Math.max(0, offset - limit) : null,
  };
};

/**
 * Apply pagination to Mongoose query
 * @param {Object} query - Mongoose query object
 * @param {Number} limit - Limit per page
 * @param {Number} offset - Offset (number to skip)
 * @returns {Object} Modified query
 */
export const applyPagination = (query, limit, offset) => {
  return query.skip(offset).limit(limit);
};

