import { Router, type IRouter } from "express";
import { db, emailEventsTable, campaignsTable } from "@workspace/db";
import { eq, gte, and, sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/overview", async (req, res) => {
  try {
    const { business, days: daysStr } = req.query as { business?: string; days?: string };
    const days = parseInt(daysStr ?? "14");
    const since = new Date();
    since.setDate(since.getDate() - days);

    const campaignIds = business
      ? (await db.select({ id: campaignsTable.id })
          .from(campaignsTable)
          .where(eq(campaignsTable.business, business))
        ).map((c) => c.id)
      : (await db.select({ id: campaignsTable.id }).from(campaignsTable)).map((c) => c.id);

    if (campaignIds.length === 0) {
      const dailyStats = Array.from({ length: days }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (days - 1 - i));
        return { date: d.toISOString().split("T")[0], sent: 0, opened: 0, clicked: 0, bounced: 0 };
      });
      return res.json({ totalSent: 0, totalOpened: 0, totalClicked: 0, totalBounced: 0, openRate: 0, clickRate: 0, bounceRate: 0, dailyStats });
    }

    const events = await db.select().from(emailEventsTable)
      .where(gte(emailEventsTable.createdAt, since));

    const filtered = campaignIds.length > 0
      ? events.filter((e) => campaignIds.includes(e.campaignId))
      : events;

    const totalSent = filtered.filter((e) => e.type === "sent").length;
    const totalOpened = filtered.filter((e) => e.type === "opened").length;
    const totalClicked = filtered.filter((e) => e.type === "clicked").length;
    const totalBounced = filtered.filter((e) => e.type === "bounced").length;

    const dailyStats = Array.from({ length: days }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      const dateStr = d.toISOString().split("T")[0];
      const dayEvents = filtered.filter((e) => e.createdAt.toISOString().split("T")[0] === dateStr);
      return {
        date: dateStr,
        sent: dayEvents.filter((e) => e.type === "sent").length,
        opened: dayEvents.filter((e) => e.type === "opened").length,
        clicked: dayEvents.filter((e) => e.type === "clicked").length,
        bounced: dayEvents.filter((e) => e.type === "bounced").length,
      };
    });

    res.json({
      totalSent,
      totalOpened,
      totalClicked,
      totalBounced,
      openRate: totalSent > 0 ? Math.round((totalOpened / totalSent) * 100 * 10) / 10 : 0,
      clickRate: totalSent > 0 ? Math.round((totalClicked / totalSent) * 100 * 10) / 10 : 0,
      bounceRate: totalSent > 0 ? Math.round((totalBounced / totalSent) * 100 * 10) / 10 : 0,
      dailyStats,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get analytics overview");
    res.status(500).json({ error: "Failed to get analytics overview" });
  }
});

router.get("/campaign/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [campaign] = await db.select().from(campaignsTable).where(eq(campaignsTable.id, id));
    if (!campaign) return res.status(404).json({ error: "Campaign not found" });

    const events = await db.select().from(emailEventsTable).where(eq(emailEventsTable.campaignId, id));

    const sent = events.filter((e) => e.type === "sent").length;
    const opened = events.filter((e) => e.type === "opened").length;
    const clicked = events.filter((e) => e.type === "clicked").length;
    const bounced = events.filter((e) => e.type === "bounced").length;

    res.json({
      campaignId: id,
      campaignName: campaign.name,
      sent,
      opened,
      clicked,
      bounced,
      openRate: sent > 0 ? Math.round((opened / sent) * 100 * 10) / 10 : 0,
      clickRate: sent > 0 ? Math.round((clicked / sent) * 100 * 10) / 10 : 0,
      bounceRate: sent > 0 ? Math.round((bounced / sent) * 100 * 10) / 10 : 0,
      events,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get campaign analytics");
    res.status(500).json({ error: "Failed to get campaign analytics" });
  }
});

export default router;
