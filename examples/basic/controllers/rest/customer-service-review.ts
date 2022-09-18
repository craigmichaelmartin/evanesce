import { Request, Response } from 'express';
import { db } from '../../factories/db';
import { signals } from '../../factories/evanesce';

export const createCustomerServiceReview = async (
  req: Request,
  res: Response
) => {
  const { title, body } = req.body;
  const review = await db.one(
    `INSERT INTO customer_service_review (title, body) values ($(title), $(body)) RETURNING *`,
    { title, body }
  );
  signals.customerServiceReviews.rebuildDependencies();
  return res.json(review);
};
