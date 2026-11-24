import { Space } from '../models/Space.js';
import { Enrollment } from '../models/Enrollment.js';
import { VISIBILITY } from '../models/LockerItem.js';
import { ROLES } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Works out how `user` (may be null) relates to a space.
 * Returns { space, isOwner, isEnrolled, isAdmin, canSeeSpace }.
 */
export async function getSpaceAccess(spaceId, user) {
  const space = await Space.findById(spaceId).lean();
  if (!space) throw ApiError.notFound('Space not found');

  const isOwner = Boolean(user) && String(space.educatorId) === user.id;
  const isAdmin = user?.role === ROLES.ADMIN;
  const isEnrolled =
    Boolean(user) && !isOwner && user.role === ROLES.STUDENT
      ? Boolean(await Enrollment.exists({ spaceId: space._id, studentId: user.id }))
      : false;

  return {
    space,
    isOwner,
    isEnrolled,
    isAdmin,
    canSeeSpace: isOwner || isAdmin || isEnrolled || space.isPublic,
  };
}

/** Which LockerItem visibilities this viewer may read. */
export function allowedVisibilities({ isOwner, isAdmin, isEnrolled, space }) {
  if (isOwner || isAdmin) return Object.values(VISIBILITY);
  if (isEnrolled) return [VISIBILITY.PUBLIC, VISIBILITY.ENROLLED_ONLY];
  if (space.isPublic) return [VISIBILITY.PUBLIC];
  return [];
}

/** Loads a space and throws unless `user` is its educator. */
export async function requireSpaceOwner(spaceId, user) {
  const access = await getSpaceAccess(spaceId, user);
  if (!access.isOwner) throw ApiError.forbidden('Only the educator who owns this space can do this');
  return access.space;
}

/** Owner, admin or enrolled student: needed for class links and history. */
export async function requireSpaceMember(spaceId, user) {
  const access = await getSpaceAccess(spaceId, user);
  if (!(access.isOwner || access.isAdmin || access.isEnrolled)) {
    throw ApiError.forbidden('Join this space to see its classes');
  }
  return access;
}
