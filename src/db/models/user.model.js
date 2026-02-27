import mongoose from "mongoose";
import { GenderEnum, ProviderEnum, RoleEnum, encrypt, decrypt } from "../../common/index.js";

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "firstName is required"],
      minLength: [2, "firstName can't be less than 2 characters"],
      maxLength: [25, "firstName can't be more than 25 characters"],
      trim: true,
    },

    lastName: {
      type: String,
      required: [true, "lastName is required"],
      minLength: [2, "lastName can't be less than 2 characters"],
      maxLength: [25, "lastName can't be more than 25 characters"],
      trim: true,
    },

    email: {
      type: String,
      required: [true, "email is required"],
      unique: [true, "email already exist"],
    },

    password: {
      type: String,
      required: function () {
        return this.provider === ProviderEnum.system;
      },
    },

    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    phoneEncrypted: {
      type: String,
    },

    gender: {
      type: String,
      enum: [GenderEnum.male, GenderEnum.female],
      default: GenderEnum.male,
    },
    profilePic: {
      type: String,
      default: "",
    },
    coverProfilePictures: [String],
    gallery: [String],
    provider: {
      type: Number,
      enum: [ProviderEnum.google, ProviderEnum.system],
      default: ProviderEnum.system,
    },
    confirmEmail: Date,
    chageCredentialTime: Date,
    isVerified: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      enum: [RoleEnum.user, RoleEnum.admin],
      default: RoleEnum.user,
    },

    expiresAt: {
      type: Date,
      index: { expires: 0 },
    },
    visitCount: {
      type: Number,
      default: 0,
    },
  },
  {
    collection: "Saraha_users",
    timestamps: true,
    strictQuery: true,
    optimisticConcurrency: true,
    autoIndex: true,
    toJSON: {
      virtuals: true,
    },
    toObject: {
      virtuals: true,
    },
  },
);

// Virtual for userName
userSchema
  .virtual("userName")
  .set(function (value) {
    const [firstName, lastName] = value?.split(" ") || [];
    this.set({ firstName, lastName });
  })
  .get(function () {
    return this.firstName + " " + this.lastName;
  });

// Virtual for phone - encrypts on set, decrypts on get
userSchema
  .virtual("phone")
  .set(function (value) {
    if (value) {
      this.phoneEncrypted = encrypt(value);
    }
  })
  .get(function () {
    if (this.phoneEncrypted) {
      return decrypt(this.phoneEncrypted);
    }
    return undefined;
  });

export const UserModel =
  mongoose.models.User || mongoose.model("User", userSchema);
