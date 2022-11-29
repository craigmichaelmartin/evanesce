import { Request, Response } from '../../../../src';
import { db } from '../../factories/db';

export const renderHomePage = async (req: Request, res: Response) => {
  const customerServiceReviews = await db.any(
    `SELECT * from customer_service_review`
  );
  return res.render('home.html', { customerServiceReviews });
};
