import { Request, Response } from 'express';
import { db } from '../../factories/db';
import { signals } from '../../factories/evanesce';

export const adjustProductInventory = async (req: Request, res: Response) => {
  const { id, quanity } = req.body;
  const product = await db.result(
    `UPDATE product set inventory = $(quanity) where id = $(id) returning *`,
    { id, quanity }
  );
  signals.products.nested[id].rebuildDependencies();
  return res.json(product);
};
