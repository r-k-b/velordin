-- http://stackoverflow.com/a/4970646/2014893

-- Here's one way to implement supertype/subtype tables for your app.

-- First, the supertype table. It contains all the columns common to all subtypes.

CREATE TABLE so4970646.publications (
  pub_id INTEGER NOT NULL PRIMARY KEY,
  pub_type CHAR(1) CHECK (pub_type IN ('A', 'B', 'P', 'S')),
  pub_url VARCHAR(64) NOT NULL UNIQUE,
  CONSTRAINT publications_superkey UNIQUE (pub_id, pub_type)
);
-- Next, a couple of subtype tables.

CREATE TABLE so4970646.articles (
  pub_id INTEGER NOT NULL,
  pub_type CHAR(1) DEFAULT 'A' CHECK (pub_type = 'A'),
  placeholder CHAR(1) NOT NULL, -- placeholder for other attributes of articles
  PRIMARY KEY (pub_id, pub_type),
  FOREIGN KEY (pub_id, pub_type) REFERENCES so4970646.publications (pub_id, pub_type)
);

CREATE TABLE so4970646.stories (
  pub_id INTEGER NOT NULL,
  pub_type CHAR(1) DEFAULT 'S' CHECK (pub_type = 'S'),
  placeholder CHAR(1) NOT NULL, -- placeholder for other attributes of stories
  PRIMARY KEY (pub_id, pub_type),
  FOREIGN KEY (pub_id, pub_type) REFERENCES so4970646.publications (pub_id, pub_type)
);
-- The CHECK() and FOREIGN KEY constraints in these subtype tables prevent rows from referencing the wrong kind of row in the supertype. It effectively partitions the pub_id values among the subtypes, guaranteeing that any given pub_id can appear in one and only one of the subtype tables. That's why you need either a PRIMARY KEY or NOT NULL UNIQUE constraint on the pair of columns {publications.pub_id, publications.pub_type}.

-- The table for comments is simple. Given that it is to have the same structure for all subtypes, you can reference the supertype.

CREATE TABLE so4970646.comments (
  pub_id INTEGER NOT NULL REFERENCES so4970646.publications (pub_id),
  comment_timestamp DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
  commenter_email VARCHAR(10) NOT NULL, -- Only allow people who have
  -- really short email addresses
  comment_text VARCHAR(30) NOT NULL,    -- Keep 'em short!
  PRIMARY KEY (pub_id, comment_timestamp, commenter_email)
);
-- Add a little bit of data.

INSERT INTO so4970646.publications VALUES
  (1,'A', 'url 1 goes here'),
  (2,'A', 'url 2 goes here'),
  (3,'S', 'url 3 goes here');

INSERT INTO so4970646.articles VALUES
  (1,'A', 'A'),
  (2,'A', 'B');

INSERT INTO so4970646.stories VALUES
  (3,'S', 'A');

INSERT INTO so4970646.comments VALUES
  (1, SYSDATETIMEOFFSET(), 'a@b.com','You''re stupid'),
  (1, SYSDATETIMEOFFSET(), 'b@c.com', 'You''re stupid, too!');

-- Now you can create a view to show all articles and resolve the join. You'd do the same for each of the subtypes.

CREATE VIEW so4970646.articles_all AS
  SELECT P.*, A.placeholder
  FROM so4970646.publications P
    INNER JOIN so4970646.articles A ON (A.pub_id = P.pub_id)

-- You might prefer names like "published_articles" instead of "articles_all".

-- To select one article and all its comments, you can just left join the two tables. (But see below why you probably won't do that.)

SELECT A.*, C.*
FROM so4970646.articles_all A
  LEFT JOIN so4970646.comments C ON (A.pub_id = C.pub_id)
WHERE A.pub_id = 1;

-- You'd probably not actually do that for a web interface, because the dbms would have to return 'n' copies of the article, where 'n' equals the number of comments. But it does make sense to do this in some applications. In applications where it makes sense, you'd use one updatable view for each subtype, and application code would use the updatable views most of the time.

-- The more common business application of a supertype/subtype involves "Parties" (the supertype), "Organizations" and "Individuals" (the subtypes, informally companies and people. Addresses, like "comments" in the example above, are related to the supertype, because all the subtypes (organizations and individuals) have addresses.

