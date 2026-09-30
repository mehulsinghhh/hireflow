import { prisma } from "../lib/prisma.js";
import { notificationPublicSelect } from "../lib/selects.js";

export async function getNotifications(
  userId: string,
  options: {
    page: number;
    limit: number;
    unreadOnly: boolean;
  }
) {
  const { page, limit, unreadOnly } = options;

  const skip = (page - 1) * limit;

  const where = {
    recipientId: userId,
    ...(unreadOnly ? { readAt: null } : {}),
  };

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      skip,
      take: limit,
      select: notificationPublicSelect,
      orderBy: {
        createdAt: "desc",
      },
    }),

    prisma.notification.count({
      where,
    }),
  ]);

  return {
    notifications,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getUnreadNotificationCount(
  userId: string
) {
  return prisma.notification.count({
    where: {
      recipientId: userId,
      readAt: null,
    },
  });
}

export async function markNotificationAsRead(
  notificationId: string,
  userId: string
) {
  const notification =
    await prisma.notification.findFirst({
      where: {
        id: notificationId,
        recipientId: userId,
      },
      select: notificationPublicSelect,
    });

  if (!notification) {
    throw new Error("NOTIFICATION_NOT_FOUND");
  }

  if (notification.readAt !== null) {
    return notification;
  }

  return prisma.notification.update({
    where: {
      id: notificationId,
    },
    data: {
      readAt: new Date(),
    },
    select: notificationPublicSelect,
  });
}