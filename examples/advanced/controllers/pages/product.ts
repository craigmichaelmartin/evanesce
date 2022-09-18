import { Request, Response } from '../../../../src';
import { db } from '../../factories/db';

export const renderProductPage = async (req: Request, res: Response) => {
  const products = await db.many(`SELECT * from product`);
  const product = products.find((product) => req.params.slug === product.slug);
  return res.render('product.html', { product });
};
