
-- ████████████████████████████████

DROP TABLE IF EXISTS velordin.activities
DROP TABLE IF EXISTS velordin.staff
DROP TABLE IF EXISTS velordin.requests
DROP TABLE IF EXISTS velordin.prospects
DROP TABLE IF EXISTS velordin.milestones
DROP TABLE IF EXISTS velordin.jobs
DROP TABLE IF EXISTS velordin.issues
DROP TABLE IF EXISTS velordin.contracts
DROP TABLE IF EXISTS velordin.contractPeriods
DROP TABLE IF EXISTS velordin.assets
DROP TABLE IF EXISTS velordin.accountInvoices
DROP TABLE IF EXISTS velordin.affiliations
DROP TABLE IF EXISTS velordin.activityAgainst

-- ████████████████████████████████


CREATE TABLE velordin.activityAgainst
(
  against_type
    NVARCHAR(50) CHECK (against_type IN
                        ('affiliation', 'accountInvoice', 'asset', 'contractPeriod', 'contract', 'issue', 'job', 'milestone', 'prospect', 'request', 'staff')),
  against_id
    NVARCHAR(50) NOT NULL PRIMARY KEY,
  CONSTRAINT against_superkey UNIQUE (against_type, against_id)
);
GO

-- ████████████████████████████████

CREATE TABLE velordin.affiliations (
  id NVARCHAR(50) PRIMARY KEY NOT NULL,
  against_type NVARCHAR(50) DEFAULT 'affiliation'
    CHECK (against_type = 'affiliation'),
  against_id   NVARCHAR(50) NOT NULL,
  createdAt DATETIMEOFFSET DEFAULT sysdatetimeoffset(),
  modifiedAt DATETIMEOFFSET DEFAULT sysdatetimeoffset(),
  FOREIGN KEY (against_type, against_id) REFERENCES velordin.activityAgainst (against_type, against_id)
);
GO

CREATE TRIGGER velordin.trg_UpdateTimestampAffiliation
  ON velordin.affiliations
AFTER UPDATE
AS
  UPDATE velordin.affiliations
  SET modifiedAt = sysdatetimeoffset()
  WHERE id IN (SELECT DISTINCT id FROM Inserted)
GO

-- ████████████████████████████████

CREATE TABLE velordin.accountInvoices (
  id NVARCHAR(50) PRIMARY KEY NOT NULL,
  against_type NVARCHAR(50) DEFAULT 'accountInvoice'
    CHECK (against_type = 'accountInvoice'),
  against_id   NVARCHAR(50) NOT NULL,
  createdAt DATETIMEOFFSET DEFAULT sysdatetimeoffset(),
  modifiedAt DATETIMEOFFSET DEFAULT sysdatetimeoffset(),
  FOREIGN KEY (against_type, against_id) REFERENCES velordin.activityAgainst (against_type, against_id)
);
GO

CREATE TRIGGER velordin.trg_UpdateTimestampAccountInvoices
  ON velordin.accountInvoices
AFTER UPDATE
AS
  UPDATE velordin.accountInvoices
  SET modifiedAt = sysdatetimeoffset()
  WHERE id IN (SELECT DISTINCT id FROM Inserted)
GO

-- ████████████████████████████████

CREATE TABLE velordin.assets (
  id NVARCHAR(50) PRIMARY KEY NOT NULL,
  against_type NVARCHAR(50) DEFAULT 'asset'
    CHECK (against_type = 'asset'),
  against_id   NVARCHAR(50) NOT NULL,
  createdAt DATETIMEOFFSET DEFAULT sysdatetimeoffset(),
  modifiedAt DATETIMEOFFSET DEFAULT sysdatetimeoffset(),
  FOREIGN KEY (against_type, against_id) REFERENCES velordin.activityAgainst (against_type, against_id)
);
GO

CREATE TRIGGER velordin.trg_UpdateTimestampAssets
  ON velordin.assets
AFTER UPDATE
AS
  UPDATE velordin.assets
  SET modifiedAt = sysdatetimeoffset()
  WHERE id IN (SELECT DISTINCT id FROM Inserted)
GO

-- ████████████████████████████████

CREATE TABLE velordin.contractPeriods (
  id NVARCHAR(50) PRIMARY KEY NOT NULL,
  against_type NVARCHAR(50) DEFAULT 'contractPeriod'
    CHECK (against_type = 'contractPeriod'),
  against_id   NVARCHAR(50) NOT NULL,
  createdAt DATETIMEOFFSET DEFAULT sysdatetimeoffset(),
  modifiedAt DATETIMEOFFSET DEFAULT sysdatetimeoffset(),
  FOREIGN KEY (against_type, against_id) REFERENCES velordin.activityAgainst (against_type, against_id)
);
GO

CREATE TRIGGER velordin.trg_UpdateTimestampContractPeriods
  ON velordin.contractPeriods
AFTER UPDATE
AS
  UPDATE velordin.contractPeriods
  SET modifiedAt = sysdatetimeoffset()
  WHERE id IN (SELECT DISTINCT id FROM Inserted)
GO

-- ████████████████████████████████

CREATE TABLE velordin.contracts (
  id NVARCHAR(50) PRIMARY KEY NOT NULL,
  against_type NVARCHAR(50) DEFAULT 'contract'
    CHECK (against_type = 'contract'),
  against_id   NVARCHAR(50) NOT NULL,
  createdAt DATETIMEOFFSET DEFAULT sysdatetimeoffset(),
  modifiedAt DATETIMEOFFSET DEFAULT sysdatetimeoffset(),
  FOREIGN KEY (against_type, against_id) REFERENCES velordin.activityAgainst (against_type, against_id)
);
GO

CREATE TRIGGER velordin.trg_UpdateTimestampContracts
  ON velordin.contracts
AFTER UPDATE
AS
  UPDATE velordin.contracts
  SET modifiedAt = sysdatetimeoffset()
  WHERE id IN (SELECT DISTINCT id FROM Inserted)
GO

-- ████████████████████████████████

CREATE TABLE velordin.issues (
  id NVARCHAR(50) PRIMARY KEY NOT NULL,
  against_type NVARCHAR(50) DEFAULT 'issue'
    CHECK (against_type = 'issue'),
  against_id   NVARCHAR(50) NOT NULL,
  createdAt DATETIMEOFFSET DEFAULT sysdatetimeoffset(),
  modifiedAt DATETIMEOFFSET DEFAULT sysdatetimeoffset(),
  FOREIGN KEY (against_type, against_id) REFERENCES velordin.activityAgainst (against_type, against_id)
);
GO

CREATE TRIGGER velordin.trg_UpdateTimestampIssues
  ON velordin.issues
AFTER UPDATE
AS
  UPDATE velordin.issues
  SET modifiedAt = sysdatetimeoffset()
  WHERE id IN (SELECT DISTINCT id FROM Inserted)
GO

-- ████████████████████████████████

CREATE TABLE velordin.jobs (
  id NVARCHAR(50) PRIMARY KEY NOT NULL,
  against_type NVARCHAR(50) DEFAULT 'job'
    CHECK (against_type = 'job'),
  against_id   NVARCHAR(50) NOT NULL,
  createdAt DATETIMEOFFSET DEFAULT sysdatetimeoffset(),
  modifiedAt DATETIMEOFFSET DEFAULT sysdatetimeoffset(),
  FOREIGN KEY (against_type, against_id) REFERENCES velordin.activityAgainst (against_type, against_id)
);
GO

CREATE TRIGGER velordin.trg_UpdateTimestampJobs
  ON velordin.jobs
AFTER UPDATE
AS
  UPDATE velordin.jobs
  SET modifiedAt = sysdatetimeoffset()
  WHERE id IN (SELECT DISTINCT id FROM Inserted)
GO

-- ████████████████████████████████

CREATE TABLE velordin.milestones (
  id NVARCHAR(50) PRIMARY KEY NOT NULL,
  against_type NVARCHAR(50) DEFAULT 'milestone'
    CHECK (against_type = 'milestone'),
  against_id   NVARCHAR(50) NOT NULL,
  createdAt DATETIMEOFFSET DEFAULT sysdatetimeoffset(),
  modifiedAt DATETIMEOFFSET DEFAULT sysdatetimeoffset(),
  FOREIGN KEY (against_type, against_id) REFERENCES velordin.activityAgainst (against_type, against_id)
);
GO

CREATE TRIGGER velordin.trg_UpdateTimestampMilestones
  ON velordin.milestones
AFTER UPDATE
AS
  UPDATE velordin.milestones
  SET modifiedAt = sysdatetimeoffset()
  WHERE id IN (SELECT DISTINCT id FROM Inserted)
GO

-- ████████████████████████████████

CREATE TABLE velordin.prospects (
  id NVARCHAR(50) PRIMARY KEY NOT NULL,
  against_type NVARCHAR(50) DEFAULT 'prospect'
    CHECK (against_type = 'prospect'),
  against_id   NVARCHAR(50) NOT NULL,
  createdAt DATETIMEOFFSET DEFAULT sysdatetimeoffset(),
  modifiedAt DATETIMEOFFSET DEFAULT sysdatetimeoffset(),
  FOREIGN KEY (against_type, against_id) REFERENCES velordin.activityAgainst (against_type, against_id)
);
GO

CREATE TRIGGER velordin.trg_UpdateTimestampProspects
  ON velordin.prospects
AFTER UPDATE
AS
  UPDATE velordin.prospects
  SET modifiedAt = sysdatetimeoffset()
  WHERE id IN (SELECT DISTINCT id FROM Inserted)
GO

-- ████████████████████████████████

CREATE TABLE velordin.requests (
  id NVARCHAR(50) PRIMARY KEY NOT NULL,
  against_type NVARCHAR(50) DEFAULT 'request'
    CHECK (against_type = 'request'),
  against_id   NVARCHAR(50) NOT NULL,
  createdAt DATETIMEOFFSET DEFAULT sysdatetimeoffset(),
  modifiedAt DATETIMEOFFSET DEFAULT sysdatetimeoffset(),
  FOREIGN KEY (against_type, against_id) REFERENCES velordin.activityAgainst (against_type, against_id)
);
GO

CREATE TRIGGER velordin.trg_UpdateTimestampRequests
  ON velordin.requests
AFTER UPDATE
AS
  UPDATE velordin.requests
  SET modifiedAt = sysdatetimeoffset()
  WHERE id IN (SELECT DISTINCT id FROM Inserted)
GO

-- ████████████████████████████████

CREATE TABLE velordin.staff (
  id NVARCHAR(50) PRIMARY KEY NOT NULL,
  against_type NVARCHAR(50) DEFAULT 'staff'
    CHECK (against_type = 'staff'),
  against_id   NVARCHAR(50) NOT NULL,
  createdAt DATETIMEOFFSET DEFAULT sysdatetimeoffset(),
  modifiedAt DATETIMEOFFSET DEFAULT sysdatetimeoffset(),
  FOREIGN KEY (against_type, against_id) REFERENCES velordin.activityAgainst (against_type, against_id)
);
GO

CREATE TRIGGER velordin.trg_UpdateTimestampStaff
  ON velordin.staff
AFTER UPDATE
AS
  UPDATE velordin.staff
  SET modifiedAt = sysdatetimeoffset()
  WHERE id IN (SELECT DISTINCT id FROM Inserted)
GO

-- ████████████████████████████████

CREATE TABLE velordin.activities
(
  id
    NVARCHAR(50) NOT NULL
    PRIMARY KEY,
  subject
    NVARCHAR(4000),
  parent
    NVARCHAR(4000),
  parent_id
    NVARCHAR(50),
  thread
    NVARCHAR(4000),
  thread_id
    NVARCHAR(50),
  --   , against
  --       nvarchar(4000),
  against_type
    NVARCHAR(50),
  against_id
    NVARCHAR(50),
  owner
    NVARCHAR(4000),
  owner_type
    NVARCHAR(4000),
  owner_id
    NVARCHAR(50),
  medium
    NVARCHAR(4000),
  visibility
    NVARCHAR(4000),
  details
    NVARCHAR(4000),
  message_id
    NVARCHAR(4000),
  date_created
    DATETIMEOFFSET,
  date_started
    DATETIMEOFFSET,
  date_logged
    DATETIMEOFFSET,
  date_ended
    DATETIMEOFFSET,
  date_due
    DATETIMEOFFSET,
  date_updated
    DATETIMEOFFSET,
  staff
    NVARCHAR(50),
  rate
    NVARCHAR(50),
  rate_charged
    FLOAT,
  class
    NVARCHAR(50),
  class_id
    BIGINT,
  task
    NVARCHAR(50),
  nonbillable
    BIGINT,
  billable
    BIGINT,
  task_id
    NVARCHAR(50),
  priority
    BIGINT,
  priority_id
    NVARCHAR(50),
  createdAt DATETIMEOFFSET DEFAULT sysdatetimeoffset(),
  modifiedAt DATETIMEOFFSET DEFAULT sysdatetimeoffset(),

  FOREIGN KEY
    (against_type, against_id)
  REFERENCES velordin.activityAgainst (against_type, against_id)
)
GO

CREATE TRIGGER velordin.trg_UpdateTimestampActivities
  ON velordin.activities
AFTER UPDATE
AS
  UPDATE velordin.activities
  SET modifiedAt = sysdatetimeoffset()
  WHERE id IN (SELECT DISTINCT id FROM Inserted)
GO
