import { Document, Model, model, Schema } from "mongoose";

export interface IProfile {
  steamId: string;
  name: string;
  img: string;
}

const ProfileSchemaFields: Record<keyof IProfile, any> = {
  steamId: {
    type: String,
    required: true,
    index: true,
  },
  name: {
    type: String,
  },
  img: {
    type: String,
  },
};

const ProfileSchema = new Schema<IProfileDocument, IProfileModel>(
  ProfileSchemaFields,
  { timestamps: true },
);

export interface IProfileDocument extends IProfile, Document {}

ProfileSchema.statics.getUniqueLicensePlatesCount =
  async function (): Promise<number> {
    return await this.distinct("address").count().exec();
  };

export interface IProfileModel extends Model<IProfileDocument> {
  getUniqueLicensePlatesCount(): Promise<number>;
}

export default model<IProfileDocument, IProfileModel>("Profile", ProfileSchema);
