import { Document, Model, model, Schema } from "mongoose";
import { SteamProfile } from "../types";

const TYPE_ENUM = ["add", "updated"];

export interface ILog {
  type: typeof TYPE_ENUM;
}

const ProfileSchemaFields: Record<keyof ILog, any> = {
  type: {
    type: String,
    enum: TYPE_ENUM
  },
};

const ProfileSchema = new Schema<IProfileDocument, IProfileModel>(ProfileSchemaFields, { timestamps: true });

export interface IProfileDocument extends ILog, Document { }

ProfileSchema.statics.getUniqueLicensePlatesCount = async function (): Promise<number> {
  return await this.distinct("address").count().exec();
};

export interface IProfileModel extends Model<IProfileDocument> {
  getUniqueLicensePlatesCount(): Promise<number>;
}

export default model<IProfileDocument, IProfileModel>("Profile", ProfileSchema);