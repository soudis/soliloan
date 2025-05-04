import { Configuration, Project } from "@prisma/client";

export type ProjectWithConfiguration = Project & {
  configuration: Configuration;
};
