# EIMS - Electricity Interruption Monitoring System

## Introduction

**EIMS**, the Electricity Interruption Monitoring System – a data-driven analytical website designed exclusively for Electricity Distribution and Management companies.

It’s mission is to empower management teams with the tools they need to make informed decisions by analyzing interruption reports based on areas and their main causes.

By providing valuable reports and insights, **EIMS** will able to enhance the efficiency of electricity distribution and it will benefit the public consumers in the long run.

## Inspiration

In June 2023, Bangladesh faced a severe electricity crisis when one of its major coal power plants shut down due to fuel shortage. The country typically struggles with electricity consumption exceeding production, and the closure of the power plant worsened the situation.

In addition to this problem, the country faced a more problems related to improper distribution and common electrical problems such as fuse malfunctions and transformer issues.

During this time, citizens experienced only 7-8 hours of electricity in a 24-hour period.

## Problem Formulation

The current situation can be summarized with the following key issues:

-   **Lack of Data:** Electricity offices lack a digital system to monitor electricity interruption reports, making it difficult to properly identify affected areas and main causes of the interruptions, and understand how bad the problem is.
-   **Inefficient Resource Allocation:** Without accurate data on interruption patterns, it's challenging to distribute available electricity resources effectively, leading to unequal distribution of electricity.

This project aims to address these challenges by creating an analytical website that provides, insightful reports of electricity interruptions like interruption duration, affected people and areas which are affected most. Which will empower the management team to take necessary steps for efficient electricity distribution and preventive measures.

## Objectives

**EIMS** is driven by a set of clear and impactful objectives :

-   **Improve Electricity Distribution:** As in Bangladesh, the electricity consumption is considered higher than the production, Our foremost goal is to help the electricity sector to provide insightful reports so that the management can distribute the electricity properly.
-   **Data-Driven Decision-Making:** Enable the management team to make data-driven decisions by analyzing interruption reports. EIMS aim to offer insights that allow for more efficient distribution and proactive measures to prevent interruptions.

In summary, the main objectives revolve around creating a digital solution that not only reduce the problem of electricity interruptions but also improve decision-making, resource management, and ultimately, the well-being of the people.

## Project Structure

![Project Structure.jpg](https://github.com/itstanmaymitra/eims/blob//main/presentation/Images/project_structure.jpg?raw=true)

## How to use

Install dependancy

```
npm install
```

Add Environment Variables:

-   Create config file to "config/config.env"
-   Add these environ variables:

```
PORT=5000

MONGO_URI=<mongodb_uri>

ITEMS_PER_PAGE=<pagination_items>

ADMIN_EMAIL=<admin_email>
ADMIN_PASSWORD=<admin_pass>

VERSION=<Version_no>
```

Steps to create HQ account or Office Admin

-   Login with admin email and pass which set in the environment variable
-   Add Office with necessaray details.
