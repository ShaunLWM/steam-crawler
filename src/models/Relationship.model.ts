import { Document, Model, model, Schema } from "mongoose";

export interface IRelationship {
  id1: string;
  id2: string;
}

const RelationshipSchemaFields: Record<keyof IRelationship, any> = {
  id1: {
    type: String,
  },
  id2: {
    type: String,
  },
};

const RelationshipSchema = new Schema<
  IRelationshipDocument,
  IRelationshipModel
>(RelationshipSchemaFields, { timestamps: true });

export interface IRelationshipDocument extends IRelationship, Document {}

RelationshipSchema.statics.getUniqueLicensePlatesCount =
  async function (): Promise<number> {
    return await this.distinct("address").count().exec();
  };

export interface IRelationshipModel extends Model<IRelationshipDocument> {
  getUniqueLicensePlatesCount(): Promise<number>;
}

export default model<IRelationshipDocument, IRelationshipModel>(
  "Relationship",
  RelationshipSchema,
);
