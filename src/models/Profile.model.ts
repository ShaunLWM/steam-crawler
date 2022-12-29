import { Document, Model, model, Schema } from "mongoose";
import { SteamProfile } from "../types";

export interface IProfile extends Pick<SteamProfile, "steamid"> {
}

const ProfileSchemaFields: Record<keyof IProfile, any> = {
  steamid: {
    type: String,
    required: true,
    index: true,
  },
};

const ProfileSchema = new Schema<IProfileDocument, IProfileModel>(ProfileSchemaFields, { timestamps: true });

export interface IProfileDocument extends IProfile, Document { }

ProfileSchema.statics.getUniqueLicensePlatesCount = async function (): Promise<number> {
  return await this.distinct("address").count().exec();
};

export interface IProfileModel extends Model<IProfileDocument> {
  getUniqueLicensePlatesCount(): Promise<number>;
}

export default model<IProfileDocument, IProfileModel>("Profile", ProfileSchema);