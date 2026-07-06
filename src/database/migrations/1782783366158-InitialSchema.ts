import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1782783366158 implements MigrationInterface {
    name = 'InitialSchema1782783366158'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "tokens" ("mint" character varying(44) NOT NULL, "symbol" character varying, "name" character varying, "uri" character varying, "decimals" integer NOT NULL DEFAULT '0', "supplyRaw" bigint NOT NULL DEFAULT '0', "supplyFormatted" numeric(20,9) NOT NULL DEFAULT '0', "mintAuthority" character varying(44), "freezeAuthority" character varying(44), "lastUpdated" TIMESTAMP NOT NULL DEFAULT now(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_685c2d9752ce327e8280c556d4d" PRIMARY KEY ("mint"))`);
        await queryRunner.query(`CREATE INDEX "IDX_daaf610565c9d7d4474420fc34" ON "tokens"  ("symbol") `);
        await queryRunner.query(`CREATE INDEX "IDX_6b4ffa178cad9cb1f55d5de2f4" ON "tokens"  ("name") `);
        await queryRunner.query(`CREATE TABLE "holders" ("id" SERIAL NOT NULL, "tokenMint" character varying(44) NOT NULL, "walletAddress" character varying(44) NOT NULL, "balance" bigint NOT NULL DEFAULT '0', "rank" integer, "lastUpdated" TIMESTAMP NOT NULL DEFAULT now(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_95943569454b751defd915d4f28" UNIQUE ("tokenMint", "walletAddress"), CONSTRAINT "PK_db78e78aa79aa06fd917151e37f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_28f265fbc1d12d806f2a5d3263" ON "holders"  ("tokenMint") `);
        await queryRunner.query(`CREATE INDEX "IDX_22cfe97da899b5d596fd6d6b14" ON "holders"  ("walletAddress") `);
        await queryRunner.query(`CREATE INDEX "IDX_9886b89c6519ef94ea6c372881" ON "holders"  ("balance") `);
        await queryRunner.query(`CREATE INDEX "IDX_38e2c11cb85cdfe1d26fa0778d" ON "holders"  ("rank") `);
        await queryRunner.query(`CREATE TABLE "wallets" ("address" character varying(44) NOT NULL, "balanceLamports" bigint NOT NULL DEFAULT '0', "tokenCount" integer NOT NULL DEFAULT '0', "activityScore" integer NOT NULL DEFAULT '0', "firstSeenDate" character varying, "lastUpdated" TIMESTAMP NOT NULL DEFAULT now(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f907d5fd09a9d374f1da4e13bd3" PRIMARY KEY ("address"))`);
        await queryRunner.query(`CREATE TABLE "transactions" ("signature" character varying(88) NOT NULL, "walletAddress" character varying(44) NOT NULL, "blockTime" bigint NOT NULL, "slot" bigint NOT NULL, "fee" bigint NOT NULL, "error" text, "rawData" jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_009e271c9813bd2249331e4c0c6" PRIMARY KEY ("signature"))`);
        await queryRunner.query(`CREATE INDEX "IDX_4c0dfa8d3f69951987f75fa583" ON "transactions"  ("walletAddress") `);
        await queryRunner.query(`CREATE INDEX "IDX_da3a74d103e1241c8dd5a6e766" ON "transactions"  ("blockTime") `);
        await queryRunner.query(`CREATE INDEX "IDX_62bb2a9cd0e6382721c7dd6939" ON "transactions"  ("slot") `);
        await queryRunner.query(`ALTER TABLE "holders" ADD CONSTRAINT "FK_28f265fbc1d12d806f2a5d3263b" FOREIGN KEY ("tokenMint") REFERENCES "tokens"("mint") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "holders" ADD CONSTRAINT "FK_22cfe97da899b5d596fd6d6b146" FOREIGN KEY ("walletAddress") REFERENCES "wallets"("address") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "holders" DROP CONSTRAINT "FK_22cfe97da899b5d596fd6d6b146"`);
        await queryRunner.query(`ALTER TABLE "holders" DROP CONSTRAINT "FK_28f265fbc1d12d806f2a5d3263b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_62bb2a9cd0e6382721c7dd6939"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_da3a74d103e1241c8dd5a6e766"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4c0dfa8d3f69951987f75fa583"`);
        await queryRunner.query(`DROP TABLE "transactions"`);
        await queryRunner.query(`DROP TABLE "wallets"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_38e2c11cb85cdfe1d26fa0778d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9886b89c6519ef94ea6c372881"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_22cfe97da899b5d596fd6d6b14"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_28f265fbc1d12d806f2a5d3263"`);
        await queryRunner.query(`DROP TABLE "holders"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6b4ffa178cad9cb1f55d5de2f4"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_daaf610565c9d7d4474420fc34"`);
        await queryRunner.query(`DROP TABLE "tokens"`);
    }

}
