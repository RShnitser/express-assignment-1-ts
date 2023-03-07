import express from "express";
import { prisma } from "../prisma/prisma-instance";
import { errorHandleMiddleware } from "./error-handler";
import "express-async-errors";
//import { validateRequest } from "zod-express-middleware";
import { z } from "zod";

const idSchema = z
  .string()
  .transform((n) => parseInt(n))
  .pipe(z.number());

const bodySchemaFull = z
  .object({
    age: z.number({
      errorMap: () => ({
        message: "age should be a number",
      }),
    }),
    name: z.string({
      errorMap: () => ({
        message: "name should be a string",
      }),
    }),
    description: z.string({
      errorMap: () => ({
        message: "description should be a string",
      }),
    }),
    breed: z.string({
      errorMap: () => ({
        message: "breed should be a string",
      }),
    }),
  })
  .strict();

const app = express();
app.use(express.json());
// All code should go below this line
app.get("/", (_req, res) => {
  res.json({ message: "Hello World!" }).status(200); // the 'status' is unnecessary but wanted to show you how to define a status
});

app.post("/dogs", async (req, res) => {
  const body = bodySchemaFull.safeParse(req.body);
  body;
  if (!body.success) {
    const errors: string[] = [];

    for (const error of body.error.issues) {
      if (error.code === z.ZodIssueCode.invalid_type) {
        errors.push(error.message);
      } else if (
        error.code === z.ZodIssueCode.unrecognized_keys
      ) {
        for (const key of error.keys) {
          errors.push(`'${key}' is not a valid key`);
        }
      }
    }
    return res.status(400).send({ errors: errors });
  } else {
    try {
      const newDog = await prisma.dog.create({
        data: {
          ...body.data,
        },
      });

      return res.status(201).send(newDog);
    } catch (e) {
      console.error(e);
      return res.status(500);
    }
  }
});

app.get("/dogs/:id", async (req, res) => {
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) {
    return res
      .status(400)
      .send({ message: "id should be a number" });
  }

  const dog = await prisma.dog.findUnique({
    where: {
      id: id.data,
    },
  });

  if (!dog) {
    return res.status(204).send({});
  }
  return res.status(200).send(dog);
});

app.get("/dogs", async (req, res) => {
  const dogs = await prisma.dog.findMany();
  return res.status(200).send(dogs);
});

app.patch("/dogs/:id", async (req, res) => {
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) {
    return res
      .status(400)
      .send({ message: "id should be a number" });
  }

  const body = bodySchemaFull.partial().safeParse(req.body);

  if (!body.success) {
    const errors: string[] = [];
    for (const error of body.error.issues) {
      if (error.code === z.ZodIssueCode.invalid_type) {
        errors.push(error.message);
      } else if (
        error.code === z.ZodIssueCode.unrecognized_keys
      ) {
        for (const key of error.keys) {
          errors.push(`'${key}' is not a valid key`);
        }
      }
    }
    return res.status(400).send({ errors: errors });
  } else {
    const updatedDog = await Promise.resolve()
      .then(() =>
        prisma.dog.update({
          where: {
            id: id.data,
          },
          data: {
            ...body.data,
          },
        })
      )
      .catch(() => null);

    if (!updatedDog) {
      return res
        .status(404)
        .send({ error: "Dog not Found" });
    }
    return res.status(201).send(updatedDog);
  }
});

app.delete("/dogs/:id", async (req, res) => {
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) {
    return res
      .status(400)
      .send({ message: "id should be a number" });
  }

  const deleted = await Promise.resolve()
    .then(() =>
      prisma.dog.delete({
        where: {
          id: id.data,
        },
      })
    )
    .catch(() => null);

  if (deleted === null) {
    return res.status(204).send({ error: "Dog not Found" });
  }

  return res.status(200).send(deleted);
});

// all your code should go above this line
app.use(errorHandleMiddleware);

const port = process.env.NODE_ENV === "test" ? 3001 : 3000;
app.listen(port, () =>
  console.log(`
🚀 Server ready at: http://localhost:${port}
`)
);
